import { supabase } from './supabase'

const INVITE_BASE_URL = 'https://onecompliment.app/join'
const INVITE_EMAIL_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation-email`
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Invitation receiver side (Accept / Decline) ───────────────
// These mirror the mobile shape exactly so a row coming from
// get_my_invitations renders the same on both clients.
export interface Invitation {
  id: string
  entity_type: 'team' | 'group'
  entity_id: string
  entity_name: string
  team_type: string | null
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invited_by_name: string | null
  created_at: string
  expires_at: string
}

export async function loadMyInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase.rpc('get_my_invitations')
  if (error) {
    console.warn('Invitations error:', error.message)
    return []
  }
  return (data as Invitation[]) ?? []
}

// JWT can quietly expire while the user composes a display name; refresh
// once and retry on that specific error so taps don't fail with a
// surprise auth toast. Mirrors mobile/withFreshSession.
async function withFreshSession<T>(fn: () => PromiseLike<T>): Promise<T> {
  const first = await fn()
  const err = (first as { error?: { message?: string } | string } | null)?.error
  const msg = typeof err === 'string' ? err : err?.message
  if (msg && /jwt (expired|invalid)/i.test(msg)) {
    try {
      await supabase.auth.refreshSession()
    } catch {
      /* ignore */
    }
    return await fn()
  }
  return first
}

export async function acceptInvitation(
  invitationId: string,
  displayName: string,
): Promise<
  | { success: true; entity_type: 'team' | 'group'; entity_id: string }
  | { error: string }
> {
  const { data, error } = await withFreshSession(() =>
    supabase.rpc('accept_invitation', {
      p_invitation_id: invitationId,
      p_display_name: displayName,
    }),
  )
  if (error) return { error: error.message }
  const result = data as
    | { success?: boolean; entity_type?: 'team' | 'group'; entity_id?: string; error?: string }
    | null
  if (result?.error) return { error: result.error }
  return {
    success: true,
    entity_type: (result?.entity_type ?? 'team') as 'team' | 'group',
    entity_id: result?.entity_id ?? '',
  }
}

export async function declineInvitation(invitationId: string): Promise<{ ok: true } | { error: string }> {
  const { error } = await withFreshSession(() =>
    supabase.rpc('decline_invitation', { p_invitation_id: invitationId }),
  )
  if (error) return { error: error.message }
  return { ok: true }
}

/**
 * Mobile sends invite URLs as `https://onecompliment.app/join/team/<code>`
 * or `https://onecompliment.app/join/group/<code>`. Pasting that URL into
 * the join-by-code field should still work, so this helper extracts the
 * code from either a full URL or a bare code. Mirrors mobile/extractInviteCode.
 */
export function extractInviteCode(input: string): string {
  const trimmed = input.trim()
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').filter(Boolean)
    return (parts[parts.length - 1] ?? '').toUpperCase()
  }
  return trimmed.toUpperCase()
}

export interface InviteSendResult {
  sent: number
  skipped: number
  /** True when the edge function delivered via SMTP. False on misconfig /
   *  not deployed / SMTP failure — caller can offer mailto or share fallback. */
  emailDelivered: boolean
  /** Reason SMTP delivery failed (only when emailDelivered is false). */
  deliveryError: string | null
  /** mailto: URL pre-filled with subject, BCC=accepted emails, body+link.
   *  Use as fallback when emailDelivered is false. */
  mailtoUrl: string | null
  /** Plain-text share message suitable for navigator.share. */
  shareMessage: string | null
  /** Emails the DB RPC accepted (already-members and bad addresses removed). */
  acceptedEmails: string[]
  /** Public join link, for caller-built share messages. */
  joinUrl: string | null
  entityName: string | null
}

function buildMailto(
  entityType: 'team' | 'group',
  entityName: string,
  joinUrl: string | null,
  inviterName: string | null,
  emails: string[],
): string | null {
  if (emails.length === 0 || !joinUrl) return null
  const word = entityType === 'team' ? 'team' : 'group'
  const who = inviterName ?? 'A friend'
  const subject = `Join ${entityName} on OneCompliment`
  const body =
    `${who} invited you to join the ${word} "${entityName}" on OneCompliment.\n\n` +
    `Tap the link to accept:\n${joinUrl}\n\n` +
    `This invitation expires in 7 days.`
  const bcc = emails.join(',')
  return `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function buildShareMessage(
  entityType: 'team' | 'group',
  entityName: string,
  joinUrl: string | null,
  inviterName: string | null,
): string | null {
  if (!joinUrl) return null
  const word = entityType === 'team' ? 'team' : 'group'
  const who = inviterName ?? 'Someone'
  return `${who} invited you to join the ${word} "${entityName}" on OneCompliment.\n\n${joinUrl}`
}

// Mirrors mobile's parser: gateway errors come back under .msg, function
// errors under .error, third parties under .message.
function parseErr(body: unknown, status: number, statusText: string): string {
  const b = body as { error?: string; msg?: string; message?: string } | string | null
  if (typeof b === 'string') return b
  return (
    b?.error ??
    b?.msg ??
    b?.message ??
    `HTTP ${status} ${statusText || ''}`.trim()
  )
}

async function dispatchInvitationEmails(
  entityType: 'team' | 'group',
  entityId: string,
  emails: string[],
): Promise<{ delivered: boolean; error: string | null }> {
  if (emails.length === 0) return { delivered: true, error: null }

  // The function only reads email/entity_type/entity_id — it re-derives the
  // entity name, invite code, join URL, and inviter name from the DB after
  // matching each recipient to a pending `invitations` row the caller
  // created via the SQL RPC. Sending display fields from here would be
  // ignored (open-relay hardening), so we don't.
  const payload = {
    invites: emails.map((email) => ({
      email,
      entity_type: entityType,
      entity_id: entityId,
    })),
  }

  try {
    // Refresh first so the attempt uses a fresh JWT (web sessions can
    // sit idle while users compose an invite list).
    try {
      await supabase.auth.refreshSession()
    } catch {
      /* ignore */
    }

    // The function requires a signed-in caller — it verifies the bearer
    // token in-function and matches invites to rows the caller created.
    // There is deliberately NO unauthenticated fallback: that path only
    // existed when the function trusted its payload, which made it an
    // open relay for branded phishing mail.
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      return {
        delivered: false,
        error: 'Your session expired — reload the page and try again.',
      }
    }

    const res = await fetch(INVITE_EMAIL_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      /* non-JSON body */
    }

    if (!res.ok) {
      const reason = parseErr(body, res.status, res.statusText)
      console.warn('send-invitation-email non-2xx:', res.status, reason, body)
      if (res.status === 401) {
        return {
          delivered: false,
          error: 'Your session expired — reload the page and try again.',
        }
      }
      if (res.status === 404) {
        return {
          delivered: false,
          error: 'Function not deployed. Run: supabase functions deploy send-invitation-email',
        }
      }
      return { delivered: false, error: reason }
    }

    const sent = (body as { sent?: number; errors?: Array<{ error?: string }> } | null)?.sent ?? 0
    const errs = (body as { errors?: Array<{ error?: string }> } | null)?.errors ?? []
    if (sent > 0) return { delivered: true, error: null }
    const firstErr = errs[0]?.error
    return {
      delivered: false,
      error: firstErr ? `Delivery failed: ${firstErr}` : 'Delivery failed: 0 emails sent',
    }
  } catch (e) {
    const msg = (e as { message?: string } | null)?.message ?? String(e)
    console.warn('Invitation email dispatch failed:', msg)
    return { delivered: false, error: msg }
  }
}

export async function sendTeamInvitations(
  teamId: string,
  emails: string[],
): Promise<InviteSendResult | { error: string }> {
  const { data, error } = await supabase.rpc('send_team_invitation', {
    p_team_id: teamId,
    p_emails: emails,
  })
  if (error) return { error: error.message }
  return finalize('team', teamId, data)
}

export async function sendGroupInvitations(
  groupId: string,
  emails: string[],
): Promise<InviteSendResult | { error: string }> {
  const { data, error } = await supabase.rpc('send_group_invitation', {
    p_group_id: groupId,
    p_emails: emails,
  })
  if (error) return { error: error.message }
  return finalize('group', groupId, data)
}

async function finalize(
  entityType: 'team' | 'group',
  entityId: string,
  data: unknown,
): Promise<InviteSendResult> {
  const d = data as {
    emails?: string[]
    sent?: number
    skipped?: number
    invite_code?: string
    inviter_name?: string | null
    team_name?: string
    group_name?: string
  }
  const accepted: string[] = d?.emails ?? []
  const inviteCode = d?.invite_code ?? null
  const inviterName = d?.inviter_name ?? null
  const entityName = d?.team_name ?? d?.group_name ?? null
  const joinUrl = inviteCode ? `${INVITE_BASE_URL}/${entityType}/${inviteCode}` : null

  const dispatch = await dispatchInvitationEmails(entityType, entityId, accepted)

  return {
    sent: d?.sent ?? 0,
    skipped: d?.skipped ?? 0,
    emailDelivered: dispatch.delivered,
    deliveryError: dispatch.error,
    mailtoUrl: buildMailto(entityType, entityName ?? '', joinUrl, inviterName, accepted),
    shareMessage: buildShareMessage(entityType, entityName ?? '', joinUrl, inviterName),
    acceptedEmails: accepted,
    joinUrl,
    entityName,
  }
}

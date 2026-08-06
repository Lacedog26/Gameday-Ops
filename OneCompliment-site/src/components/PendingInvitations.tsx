import { useState } from 'react'
import {
  acceptInvitation,
  declineInvitation,
  type Invitation,
} from '../lib/invitations'

const TYPE_ICON: Record<string, string> = {
  school: '🏫',
  organization: '🏢',
  general: '🏠',
  group: '👥',
}

type Props = {
  invitations: Invitation[]
  /** The viewer's @username — sent as their identity to the
   *  acceptInvitation RPC. */
  username: string | null
  /** Whether the viewer has a linked email. Accepting an invitation
   *  requires a linked email so the membership row survives session
   *  loss / device switch — same gate as create_group. */
  hasEmail: boolean
  /** Opens the Settings link-email flow when the viewer needs to link
   *  before accepting. */
  onOpenLinkEmail: () => void
  /** Called after Accept / Decline succeeds — caller refetches lists. */
  onChange: () => void
}

/**
 * Mirrors mobile/InviteCard. One card per pending invite with Accept /
 * Decline buttons. The user's @username is what members will see —
 * there is no separate per-group display name. Renders nothing if
 * there's nothing pending so callers can drop it in unconditionally.
 */
export function PendingInvitations({ invitations, username, hasEmail, onOpenLinkEmail, onChange }: Props) {
  if (invitations.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="oc-label">YOU'VE BEEN INVITED · {invitations.length}</div>
      {invitations.map((inv) => (
        <InviteCard
          key={inv.id}
          inv={inv}
          username={username}
          hasEmail={hasEmail}
          onOpenLinkEmail={onOpenLinkEmail}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

function InviteCard({
  inv,
  username,
  hasEmail,
  onOpenLinkEmail,
  onChange,
}: {
  inv: Invitation
  username: string | null
  hasEmail: boolean
  onOpenLinkEmail: () => void
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ message: string; needsEmail?: boolean } | null>(null)

  const icon =
    inv.entity_type === 'team'
      ? TYPE_ICON[inv.team_type ?? 'general'] ?? '🏢'
      : TYPE_ICON.group

  const accept = async () => {
    if (!username) {
      setError({ message: 'Pick a username first in Settings.' })
      return
    }
    if (!hasEmail) {
      setError({
        message:
          'Link an email first. Memberships are tied to your account so they survive cleared cookies and follow you to mobile.',
        needsEmail: true,
      })
      return
    }
    setError(null)
    setBusy(true)
    const result = await acceptInvitation(inv.id, username)
    setBusy(false)
    if ('error' in result) {
      // Server may also reject for email — surface its message with the
      // same Link-Email CTA so the user can recover inline.
      const needsEmail = /email/i.test(result.error) && !hasEmail
      setError({ message: result.error, needsEmail })
      return
    }
    onChange()
  }

  const decline = async () => {
    setBusy(true)
    const result = await declineInvitation(inv.id)
    setBusy(false)
    if ('error' in result) {
      setError({ message: result.error })
      return
    }
    onChange()
  }

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        background: 'rgba(245,200,66,.07)',
        border: '1px solid rgba(245,200,66,.30)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 28 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="font-bold"
            style={{
              fontSize: 15,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {inv.entity_name}
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}
          >
            Invited by {inv.invited_by_name ?? 'a member'}
            {inv.entity_type === 'team' && inv.team_type ? ` · ${inv.team_type}` : ''}
          </div>
        </div>
      </div>

      {username && (
        <div className="oc-label-dim" style={{ fontSize: 12 }}>
          You'll appear as <strong style={{ color: 'var(--color-gold)' }}>@{username}</strong>
        </div>
      )}

      {error && (
        <div
          className="flex flex-col gap-2"
          style={{
            fontSize: 12,
            color: '#FF6B6B',
            background: 'rgba(255,107,107,.08)',
            border: '1px solid rgba(255,107,107,.2)',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <span>{error.message}</span>
          {error.needsEmail && (
            <button
              onClick={onOpenLinkEmail}
              className="oc-btn"
              style={{ alignSelf: 'flex-start', width: 'auto' }}
            >
              ✉️ Link email now
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={decline}
          disabled={busy}
          className="oc-btn-ghost"
          style={{ flex: 1 }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          disabled={busy}
          className="oc-btn"
          style={{ flex: 2 }}
        >
          {busy ? 'Saving…' : 'Accept ✦'}
        </button>
      </div>
    </div>
  )
}

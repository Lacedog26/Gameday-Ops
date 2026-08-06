import { useState } from 'react'
import {
  sendGroupInvitations,
  sendTeamInvitations,
  type InviteSendResult,
} from '../lib/invitations'

type Props = {
  entityType: 'team' | 'group'
  entityId: string
  /** Closes the panel. Caller is also free to leave it open. */
  onClose?: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Reusable invite-by-email panel for both groups and teams.
 *
 * Flow:
 *  1. User adds emails as chips, then taps Send
 *  2. The matching `send_*_invitation` RPC filters out already-members
 *  3. The send-invitation-email edge function delivers via Brevo
 *  4. If delivery fails, fall back to navigator.share or mailto:
 *     so the admin can dispatch from their own client
 *
 * All four outcomes are surfaced in the result block — never silently fail.
 */
export function InviteByEmail({ entityType, entityId, onClose }: Props) {
  const [draft, setDraft] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<InviteSendResult | null>(null)

  const addEmail = () => {
    const value = draft.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    if (emails.includes(value)) {
      setError('Already added.')
      return
    }
    if (emails.length >= 25) {
      setError('Up to 25 invitations at a time.')
      return
    }
    setEmails([...emails, value])
    setDraft('')
    setError(null)
  }

  const send = async () => {
    if (emails.length === 0) {
      setError('Add at least one email address.')
      return
    }
    setError(null)
    setBusy(true)
    const fn = entityType === 'team' ? sendTeamInvitations : sendGroupInvitations
    const res = await fn(entityId, emails)
    setBusy(false)
    if ('error' in res) {
      setError(res.error)
      return
    }
    setResult(res)
    setEmails([])
  }

  const useShare = async (msg: string) => {
    if ('share' in navigator) {
      try {
        await navigator.share({ text: msg })
        return
      } catch {
        /* share dialog dismissed — fall through */
      }
    }
    await navigator.clipboard?.writeText(msg).catch(() => {})
    alert('✓ Invite copied — paste it anywhere.')
  }

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        background: 'rgba(168,230,207,.06)',
        border: '1px solid rgba(168,230,207,.2)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '.25em',
            textTransform: 'uppercase',
            color: 'var(--color-green)',
          }}
        >
          Invite by Email
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--faint)',
              fontSize: 16,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="oc-input"
          style={{ flex: 1 }}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="friend@example.com"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addEmail()
            }
          }}
        />
        <button
          onClick={addEmail}
          style={{
            background: 'rgba(168,230,207,.15)',
            border: '1px solid rgba(168,230,207,.35)',
            borderRadius: 12,
            padding: '0 14px',
            fontSize: 13,
            color: 'var(--color-green)',
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Add
        </button>
      </div>

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {emails.map((e) => (
            <span
              key={e}
              className="inline-flex items-center gap-1.5"
              style={{
                background: 'rgba(168,230,207,.10)',
                border: '1px solid rgba(168,230,207,.22)',
                borderRadius: 20,
                padding: '4px 10px',
                fontSize: 12,
                color: 'var(--color-green)',
              }}
            >
              {e}
              <button
                onClick={() => setEmails(emails.filter((x) => x !== e))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(168,230,207,.6)',
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            fontSize: 12,
            color: '#FF6B6B',
            background: 'rgba(255,107,107,.08)',
            border: '1px solid rgba(255,107,107,.2)',
            borderRadius: 10,
            padding: '8px 10px',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={send}
        disabled={busy || emails.length === 0}
        className="oc-btn"
      >
        {busy
          ? 'Sending…'
          : emails.length === 0
          ? 'Add an email'
          : `Send ${emails.length} invite${emails.length !== 1 ? 's' : ''} →`}
      </button>

      {result && (
        <ResultBlock
          result={result}
          onUseShare={useShare}
        />
      )}
    </div>
  )
}

function ResultBlock({
  result,
  onUseShare,
}: {
  result: InviteSendResult
  onUseShare: (msg: string) => void
}) {
  return (
    <div
      className="flex flex-col gap-2"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      {result.emailDelivered && result.sent > 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-green)', fontWeight: 700 }}>
          ✓ Sent {result.sent} invitation{result.sent !== 1 ? 's' : ''}
          {result.skipped > 0 && (
            <span
              style={{ color: 'var(--faint)', fontWeight: 400, marginLeft: 6 }}
            >
              ({result.skipped} already in)
            </span>
          )}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}>
            Couldn't deliver via email.
          </div>
          {result.deliveryError && (
            <div
              className="font-mono"
              style={{ fontSize: 11, color: 'var(--faint)', lineHeight: 1.55 }}
            >
              {result.deliveryError}
            </div>
          )}
          {result.shareMessage && (
            <button
              onClick={() => onUseShare(result.shareMessage!)}
              className="oc-btn-ghost"
              style={{ marginTop: 4 }}
            >
              📤 Share invite manually
            </button>
          )}
          {result.mailtoUrl && (
            <a
              href={result.mailtoUrl}
              style={{
                background: 'none',
                border: '1px solid var(--bord)',
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                color: 'var(--dim)',
                fontFamily: 'var(--font-serif)',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
              }}
            >
              ✉️ Open my mail client
            </a>
          )}
        </>
      )}
      {result.joinUrl && (
        <div
          className="font-mono"
          style={{ fontSize: 11, color: 'var(--faint)', wordBreak: 'break-all' }}
        >
          Direct link: {result.joinUrl}
        </div>
      )}
    </div>
  )
}

import { useRef, useState } from 'react'
import { checkUsernameAvailable } from '../lib/supabase'

type Props = {
  onClaimed: (username: string) => Promise<{ ok: true; userId: string } | { ok: false; error: string }>
  /** Optional skip path — onboarding allows skipping; settings does not. */
  onSkip?: () => void
}

const RULES = /^[a-z0-9_]{3,20}$/

export function UsernameClaim({ onClaimed, onSkip }: Props) {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'taken' | 'ok' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const checkingFor = useRef('')

  const onChange = async (v: string) => {
    setValue(v)
    setError(null)
    if (!RULES.test(v)) {
      setStatus('idle')
      return
    }
    checkingFor.current = v
    setStatus('checking')
    const ok = await checkUsernameAvailable(v)
    if (checkingFor.current !== v) return // stale response — a newer check is in flight
    setStatus(ok ? 'ok' : 'taken')
  }

  const submit = async () => {
    if (!RULES.test(value)) {
      setError('Use 3–20 letters, numbers or _ only.')
      return
    }
    setSubmitting(true)
    const result = await onClaimed(value)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      setStatus('error')
    }
  }

  const canSubmit = !submitting && status === 'ok'

  return (
    <div className="flex flex-col items-center text-center" style={{ gap: 24, paddingTop: 32 }}>
      <div className="bob" style={{ fontSize: 64 }}>🌻</div>
      <div className="font-bold" style={{ fontSize: 'clamp(22px,5vw,28px)', lineHeight: 1.25 }}>
        Pick a username.
      </div>
      <div style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.7, maxWidth: 340 }}>
        Friends use this to find you when they invite you to a group. You can change it later.
      </div>
      <div className="flex flex-col gap-1.5 w-full" style={{ maxWidth: 360 }}>
        <input
          autoFocus
          className="oc-input"
          placeholder="yourname"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          maxLength={20}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <div
          className="font-mono"
          style={{
            fontSize: 11,
            color:
              status === 'taken' || status === 'error'
                ? '#FF6B6B'
                : status === 'ok'
                ? 'var(--color-green)'
                : 'var(--faint)',
            minHeight: 16,
          }}
        >
          {error ??
            (status === 'checking'
              ? 'Checking…'
              : status === 'taken'
              ? 'Taken — try another.'
              : status === 'ok'
              ? '✓ Available'
              : '3–20 letters, numbers or _')}
        </div>
      </div>
      <button
        onClick={submit}
        disabled={!canSubmit}
        className="oc-btn"
        style={{ maxWidth: 360 }}
      >
        {submitting ? 'Saving…' : 'Claim it ☀️'}
      </button>
      {onSkip && (
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--faint)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'var(--font-serif)',
          }}
        >
          Skip for now
        </button>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { checkUsernameAvailable, emailExists, sendEmailOtp } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Props = {
  visible: boolean
  onCancel: () => void
  /**
   * Called after the setup completes. Two shapes converge:
   *   - new user:       { username: 'foo', email?, emailSent } — username claimed
   *                     on the anon session; caller routes to verify if email sent.
   *   - returning user: { username: '', email, emailSent: true } — only an OTP was
   *                     sent; the verify step will load their existing account.
   * Caller decides routing by `emailSent`.
   */
  onComplete: (result: { username: string; email?: string; emailSent: boolean }) => void
}

const USERNAME_RULES = /^[a-z0-9_]{3,20}$/
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_DEBOUNCE_MS = 400

type EmailStatus = 'idle' | 'checking' | 'exists' | 'new'

/**
 * Web counterpart of mobile's UsernameRequiredModal. Branches:
 *   - typed email already in db → skip username, send OTP, sign back in
 *   - new email (or empty)      → require a username; email is optional
 * Username field is hidden when the email matches an existing account.
 */
export function UsernameRequiredModal({ visible, onCancel, onComplete }: Props) {
  // Use the hook's wrapped claimUsername so it auto-refreshes parent auth
  // state on success — without that, the parent's `!auth.username` guard
  // would keep the modal open after a successful claim.
  const { claimUsername } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const checkingFor = useRef('')

  // Real-time existence check. Debounced; stale responses are dropped via
  // checkingFor so a slow lookup for "a@b" doesn't overwrite a fast lookup
  // for "alice@example.com".
  useEffect(() => {
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_OK.test(trimmed)) {
      setEmailStatus('idle')
      return
    }
    checkingFor.current = trimmed
    setEmailStatus('checking')
    const t = setTimeout(async () => {
      const exists = await emailExists(trimmed)
      if (checkingFor.current !== trimmed) return
      setEmailStatus(exists ? 'exists' : 'new')
    }, EMAIL_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [email])

  if (!visible) return null

  const isReturning = emailStatus === 'exists'

  const reset = () => {
    setUsername('')
    setEmail('')
    setEmailStatus('idle')
    setError('')
    setSaving(false)
  }

  const handleCancel = () => {
    reset()
    onCancel()
  }

  const handleContinue = async () => {
    const trimmedEmail = email.trim().toLowerCase()

    // Returning-user flow: no username claim, just send OTP. The merge RPC
    // inside verifyEmailOtp will collapse the (empty) anon session into the
    // existing email user, who already has their username/streak/etc.
    if (isReturning) {
      setSaving(true)
      setError('')
      const otp = await sendEmailOtp(trimmedEmail)
      setSaving(false)
      if (!otp.ok) {
        setError(otp.error || 'Could not send code. Try again.')
        return
      }
      onComplete({ username: '', email: trimmedEmail, emailSent: true })
      reset()
      return
    }

    // New-user flow: username required, email optional. If email is filled
    // AND is mid-check, hold off — the user might have just typed an email
    // that matches an existing account.
    if (emailStatus === 'checking') {
      setError('Hold on — checking your email…')
      return
    }

    const name = username.trim().toLowerCase()
    const wantsEmail = EMAIL_OK.test(trimmedEmail)

    if (!USERNAME_RULES.test(name)) {
      setError('Username must be 3–20 letters, numbers, or _')
      return
    }
    if (email.trim().length > 0 && !wantsEmail) {
      setError('Enter a valid email address (or leave it blank).')
      return
    }

    setSaving(true)
    setError('')

    const available = await checkUsernameAvailable(name)
    if (!available) {
      setSaving(false)
      setError('That username is taken. Try another.')
      return
    }

    const result = await claimUsername(name)
    if (!result.ok) {
      setSaving(false)
      setError(result.error || 'Could not save username. Please try again.')
      return
    }

    let emailSent = false
    if (wantsEmail) {
      const otp = await sendEmailOtp(trimmedEmail)
      if (otp.ok) emailSent = true
      // Non-fatal: failed OTP doesn't block the username save.
      // The user can link email later from Settings.
    }

    setSaving(false)
    onComplete({ username: name, email: wantsEmail ? trimmedEmail : undefined, emailSent })
    reset()
  }

  const emailHintColor =
    emailStatus === 'exists'
      ? 'var(--color-green)'
      : emailStatus === 'checking'
      ? 'var(--faint)'
      : emailStatus === 'new'
      ? 'var(--color-gold)'
      : 'var(--faint)'

  const emailHint =
    emailStatus === 'exists'
      ? '✓ Welcome back — we\'ll send a code to sign you in.'
      : emailStatus === 'checking'
      ? 'Checking…'
      : emailStatus === 'new'
      ? 'New account — pick a username below.'
      : ''

  const buttonLabel = saving
    ? isReturning
      ? 'Sending code…'
      : 'Saving…'
    : isReturning
    ? 'Send sign-in code'
    : 'Continue'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 1000,
      }}
    >
      <div
        className="flex flex-col"
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#2A2A2A',
          borderRadius: 20,
          padding: 24,
          gap: 14,
        }}
      >
        <div className="font-bold" style={{ fontSize: 22, color: '#F2EDE4', textAlign: 'center' }}>
          One quick setup
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'rgba(242,237,228,0.65)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Sign in with your email, or pick a username to start fresh.
        </div>

        {/* Email — leads, drives the branch */}
        <div className="flex flex-col gap-1.5">
          <div
            className="font-bold"
            style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--color-gold)' }}
          >
            EMAIL{' '}
            {!isReturning && (
              <span
                style={{
                  color: 'rgba(242,237,228,0.40)',
                  fontWeight: 400,
                  letterSpacing: '0.1em',
                }}
              >
                · optional
              </span>
            )}
          </div>
          <input
            className="oc-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            placeholder="you@email.com"
            maxLength={120}
            disabled={saving}
          />
          {emailHint && (
            <div
              className="font-mono"
              style={{ fontSize: 11, color: emailHintColor, minHeight: 14 }}
            >
              {emailHint}
            </div>
          )}
        </div>

        {/* Username — hidden for returning users */}
        {!isReturning && (
          <div className="flex flex-col gap-1.5">
            <div
              className="font-bold"
              style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--color-gold)' }}
            >
              USERNAME
            </div>
            <input
              autoFocus
              className="oc-input"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                setError('')
              }}
              placeholder="choose_a_username"
              maxLength={20}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={saving}
            />
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13, color: 'rgba(255,120,120,0.9)', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2.5" style={{ marginTop: 6 }}>
          <button
            onClick={handleContinue}
            disabled={saving}
            className="oc-btn"
            style={{ width: '100%' }}
          >
            {buttonLabel}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#F2EDE4',
              borderRadius: 14,
              padding: '15px 0',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'var(--font-serif)',
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

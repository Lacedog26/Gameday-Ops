import { useEffect, useRef, useState } from 'react'
import { sendEmailOtp, verifyEmailOtp } from '../lib/supabase'

type Step = 'input' | 'verify' | 'done'

type Props = {
  /** Pre-existing linked email if the user already verified once. */
  initialEmail: string | null
  /** Closes the LinkEmail flow and returns to wherever it was opened from. */
  onClose: () => void
  /** Fires after a successful verify so the parent can refresh its auth state. */
  onLinked?: () => void
  /**
   * When true, start at the 'verify' step with `initialEmail` pre-filled.
   * Used by upstream flows (e.g. UsernameRequiredModal) that already sent
   * the OTP and just need the user to enter the code. Without this, an
   * `initialEmail` is treated as "already linked" and jumps to 'done'.
   */
  autoVerify?: boolean
}

/**
 * Email-link flow ported from the mobile LinkEmailScreen. Three steps:
 *   1. input  — collect email, call sendEmailOtp
 *   2. verify — enter 6-digit code, call verifyEmailOtp (merges anon → email)
 *   3. done   — confirm linked
 *
 * The 60s resend cooldown matches the mobile app so we don't blast the
 * Supabase OTP rate limiter when users tap "Resend" repeatedly.
 */
export function LinkEmail({ initialEmail, onClose, onLinked, autoVerify }: Props) {
  const [step, setStep] = useState<Step>(
    autoVerify && initialEmail ? 'verify' : initialEmail ? 'done' : 'input',
  )
  const [emailInput, setEmailInput] = useState(initialEmail ?? '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(autoVerify ? 60 : 0)
  const [mergePending, setMergePending] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  useEffect(() => {
    if (step === 'verify') codeRef.current?.focus()
  }, [step])

  const sendOtp = async () => {
    const email = emailInput.trim().toLowerCase()
    if (!email.includes('@') || !email.includes('.')) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
    setError('')
    const result = await sendEmailOtp(email)
    setLoading(false)
    if (!result.ok) {
      setError(result.error || 'Failed to send code.')
      return
    }
    setStep('verify')
    setResendIn(60)
  }

  const resend = async () => {
    if (resendIn > 0 || loading) return
    setLoading(true)
    setError('')
    const result = await sendEmailOtp(emailInput.trim().toLowerCase())
    setLoading(false)
    if (!result.ok) {
      setError(result.error || 'Failed to resend.')
      return
    }
    setResendIn(60)
    setCode('')
    codeRef.current?.focus()
  }

  const verify = async (submittedCode?: string) => {
    // Accept an explicit code so the auto-submit path can pass the freshly
    // typed value directly. Relying on the `code` state here races the
    // setCode() update — at the 6th keystroke `code` is still the 5-digit
    // closure value, which spuriously triggered "Enter all 6 digits.".
    const codeToVerify = submittedCode ?? code
    if (codeToVerify.length < 6) {
      setError('Enter all 6 digits.')
      return
    }
    setLoading(true)
    setError('')
    const result = await verifyEmailOtp(emailInput.trim().toLowerCase(), codeToVerify)
    setLoading(false)
    if (!result.ok) {
      setError(result.error || 'Invalid code.')
      return
    }
    // Email IS linked even if the anon-data merge failed — don't block the
    // done step, but be honest that the transfer is still pending (it
    // auto-retries on the next visit; see retryPendingMerge).
    setMergePending(Boolean(result.mergeError))
    setStep('done')
    onLinked?.()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="oc-btn-back">← Back</button>
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'rgba(242,237,228,0.5)',
            textTransform: 'uppercase',
          }}
        >
          Link Email
        </div>
      </div>

      {step === 'input' && (
        <>
          <div
            className="font-bold"
            style={{ fontSize: 22, color: '#F2EDE4', lineHeight: 1.25 }}
          >
            Save your streak.
          </div>
          <div style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.65 }}>
            Link an email so your username, streak, and groups follow you to any device. We'll
            send a 6-digit code — no password.
          </div>
          <div className="flex flex-col gap-2">
            <div className="oc-label-dim">EMAIL ADDRESS</div>
            <input
              autoFocus
              type="email"
              autoComplete="email"
              inputMode="email"
              className="oc-input"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendOtp()
              }}
              maxLength={120}
            />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button onClick={sendOtp} className="oc-btn" disabled={loading}>
            {loading ? 'Sending…' : 'Send code →'}
          </button>
        </>
      )}

      {step === 'verify' && (
        <>
          <div
            className="font-bold"
            style={{ fontSize: 22, color: '#F2EDE4', lineHeight: 1.25 }}
          >
            Check your email.
          </div>
          <div style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.65 }}>
            We sent a 6-digit code to{' '}
            <strong style={{ color: 'var(--text)', fontWeight: 700 }}>
              {emailInput.trim().toLowerCase()}
            </strong>
            . It might take a minute.
          </div>
          <div className="flex flex-col gap-2">
            <div className="oc-label-dim">VERIFICATION CODE</div>
            <div className="flex gap-2 justify-center" onClick={() => codeRef.current?.focus()}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="font-mono font-bold flex items-center justify-center"
                  style={{
                    width: 40,
                    height: 52,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${
                      code.length === i ? 'rgba(245,200,66,0.50)' : 'var(--bord)'
                    }`,
                    fontSize: 22,
                    color: 'var(--text)',
                  }}
                >
                  {code[i] ?? ''}
                </div>
              ))}
            </div>
            <input
              ref={codeRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(v)
                setError('')
                if (v.length === 6) {
                  // Auto-submit when all six digits are in. Pass `v` directly —
                  // the `code` state hasn't updated yet at this point.
                  verify(v)
                }
              }}
              style={{
                position: 'absolute',
                left: -9999,
                width: 1,
                height: 1,
                opacity: 0,
              }}
            />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button
            onClick={() => verify()}
            className="oc-btn"
            disabled={loading || code.length < 6}
          >
            {loading ? 'Verifying…' : 'Verify ☀️'}
          </button>
          <div className="text-center">
            <button
              onClick={resend}
              disabled={resendIn > 0 || loading}
              style={{
                background: 'none',
                border: 'none',
                color: resendIn > 0 ? 'var(--faint)' : 'var(--color-gold)',
                fontSize: 13,
                cursor: resendIn > 0 ? 'default' : 'pointer',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
          <button
            onClick={() => {
              setStep('input')
              setCode('')
              setError('')
            }}
            className="oc-btn-ghost"
          >
            Use a different email
          </button>
        </>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center text-center" style={{ gap: 16, padding: '12px 0' }}>
          <div style={{ fontSize: 56 }}>🌻</div>
          <div className="font-bold" style={{ fontSize: 20, color: '#F2EDE4' }}>
            Email linked.
          </div>
          <div style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.65, maxWidth: 320 }}>
            {mergePending ? (
              <>
                Your email is linked to{' '}
                <strong style={{ color: 'var(--text)', fontWeight: 700 }}>
                  {emailInput.trim().toLowerCase()}
                </strong>
                , but moving your streak, username, and groups over hit a snag. We'll finish the
                transfer automatically the next time you open the app — nothing is lost.
              </>
            ) : (
              <>
                Your streak, username, and groups are saved to{' '}
                <strong style={{ color: 'var(--text)', fontWeight: 700 }}>
                  {emailInput.trim().toLowerCase()}
                </strong>
                . Sign in from any device with the same email to pick up where you left off.
              </>
            )}
          </div>
          <button onClick={onClose} className="oc-btn" style={{ maxWidth: 320 }}>
            Done
          </button>
          {/* Let an already-linked user re-link a different address. Without
              this, opening Link Email while linked dead-ends on this screen
              with no way to change the email. */}
          <button
            onClick={() => {
              setStep('input')
              setEmailInput('')
              setCode('')
              setError('')
            }}
            className="oc-btn-ghost"
            style={{ maxWidth: 320 }}
          >
            Use a different email
          </button>
        </div>
      )}
    </div>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        color: '#FF6B6B',
        background: 'rgba(255,107,107,.08)',
        border: '1px solid rgba(255,107,107,.2)',
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      {children}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'
import { allTeams, productConfig } from '../../product'
import { PLAN, TRIAL_POLICY } from '../../billing'
import { usePageTitle } from '../../hooks/usePageTitle'

const ROLES = ['Coach', 'Football Operations', 'Strength & Conditioning', 'Analyst', 'Other'] as const

/**
 * Start-your-trial signup. Collects enough to feel like a real football-program
 * account (name, program, role) — not an anonymous email/password — then creates
 * the Supabase account. The trial itself begins only after the card-required
 * Stripe checkout on the billing screen; signup just creates the account.
 */
export default function SignupPage() {
  usePageTitle(`${safeName()} — Start Free Trial`)
  const { signUp, authAvailable } = useAuth()
  const nav = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [school, setSchool] = useState('')
  const [role, setRole] = useState<string>('')
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const teamNames = useMemo(() => {
    try {
      return allTeams().map((t) => t.name).sort((a, b) => a.localeCompare(b))
    } catch {
      return []
    }
  }, [])

  const passwordProblem =
    password.length > 0 && password.length < 8 ? 'Password must be at least 8 characters.' : ''
  const confirmProblem =
    confirm.length > 0 && confirm !== password ? 'Passwords do not match.' : ''

  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!email.trim() &&
    password.length >= 8 &&
    confirm === password &&
    !!school.trim() &&
    !!role &&
    agree &&
    authAvailable &&
    !busy

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    if (!canSubmit) return
    setBusy(true)
    try {
      const { error, needsConfirm } = await signUp(email.trim(), password, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        school: school.trim(),
        role,
      })
      if (error) {
        setErr(error)
      } else if (needsConfirm) {
        setMsg(
          'Account created! Check your email to confirm your address, then sign in to add a card and start your 14-day trial.',
        )
      } else {
        // Email confirmation disabled → straight to card-required checkout.
        nav('/billing')
      }
    } finally {
      setBusy(false)
    }
  }

  const input =
    'rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 outline-none focus:border-emerald-400'

  return (
    <div className="min-h-full w-full overflow-y-auto bg-[#05070f] px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="font-display text-2xl font-extrabold uppercase tracking-wide">{safeName()}</div>
          <p className="mt-1 text-sm text-slate-400">Start Your {PLAN.trialDays}-Day Free Trial</p>
        </div>

        {!authAvailable && (
          <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
            Backend not configured for this deployment — signup is unavailable.
          </p>
        )}

        {msg ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-center text-sm text-emerald-100">
            {msg}
            <div className="mt-4">
              <Link to="/login" className="font-bold text-emerald-300 hover:underline">
                Go to sign in →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input className={input} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required />
              <input className={input} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required />
            </div>
            <input className={input} type="email" placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />

            <input className={input} list="gdo-teams" placeholder="School / Program" value={school} onChange={(e) => setSchool(e.target.value)} required />
            <datalist id="gdo-teams">
              {teamNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>

            <select className={`${input} ${role ? 'text-white' : 'text-slate-400'}`} value={role} onChange={(e) => setRole(e.target.value)} required>
              <option value="" disabled>Your role</option>
              {ROLES.map((r) => (
                <option key={r} value={r} className="text-navy-950">{r}</option>
              ))}
            </select>

            <input className={input} type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            {passwordProblem && <p className="-mt-1 text-xs text-amber-300">{passwordProblem}</p>}
            <input className={input} type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            {confirmProblem && <p className="-mt-1 text-xs text-amber-300">{confirmProblem}</p>}

            <label className="mt-1 flex items-start gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-emerald-500" />
              <span>
                By starting your free trial, you agree to the{' '}
                <Link to="/terms" className="text-emerald-300 hover:underline">Terms of Service</Link> and{' '}
                <Link to="/privacy" className="text-emerald-300 hover:underline">Privacy Policy</Link>.
              </span>
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-1 rounded-lg bg-emerald-500 px-4 py-3 font-bold uppercase tracking-wide text-navy-950 transition hover:bg-emerald-400 disabled:opacity-40"
            >
              {busy ? '…' : 'Start Free Trial'}
            </button>

            {err && <p className="text-center text-sm text-red-300">{err}</p>}

            <p className="mt-1 text-center text-[11px] leading-relaxed text-slate-500">{TRIAL_POLICY.short}</p>
          </form>
        )}

        <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
          <Link to="/welcome" className="hover:text-white">← Back to home</Link>
          <Link to="/login" className="hover:text-white">Already have an account? Sign in →</Link>
        </div>
      </div>
    </div>
  )
}

function safeName(): string {
  try {
    return productConfig().productName
  } catch {
    return 'GameDayOps College'
  }
}

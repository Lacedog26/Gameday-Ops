import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'
import { productConfig } from '../../product'
import { usePageTitle } from '../../hooks/usePageTitle'

type Mode = 'signin' | 'reset'

/** Email/password sign-in for the admin. New customers sign up at /signup. */
export default function LoginPage() {
  usePageTitle(`${titleName()} — Sign In`)
  const { signIn, resetPassword, authAvailable } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    setBusy(true)
    try {
      if (mode === 'reset') {
        const { error } = await resetPassword(email)
        setMsg(error ?? 'Password reset email sent (if the account exists).')
      } else {
        const { error } = await signIn(email, password)
        if (error) setMsg(error)
        else nav('/')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-full w-full place-items-center bg-[#05070f] px-6 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="font-display text-2xl font-extrabold uppercase tracking-wide">
            {productConfig().productName}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {mode === 'reset' ? 'Reset your password' : 'Sign in to your account'}
          </p>
        </div>

        {!authAvailable && (
          <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
            Backend not configured for this deployment — auth is unavailable.
          </p>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu" autoComplete="email"
            className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 outline-none focus:border-emerald-400"
          />
          {mode !== 'reset' && (
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" autoComplete="current-password"
              className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 outline-none focus:border-emerald-400"
            />
          )}
          <button
            type="submit" disabled={busy || !authAvailable}
            className="rounded-lg bg-emerald-500 px-4 py-3 font-bold uppercase tracking-wide text-navy-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? '…' : mode === 'reset' ? 'Send Reset Link' : 'Sign In'}
          </button>
        </form>

        {msg && <p className="mt-3 text-center text-sm text-slate-300">{msg}</p>}

        <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
          {mode === 'reset' ? (
            <button onClick={() => setMode('signin')} className="hover:text-white">← Sign in</button>
          ) : (
            <button onClick={() => setMode('reset')} className="hover:text-white">Forgot password?</button>
          )}
          <Link to="/signup" className="hover:text-white">Start free trial →</Link>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <Link to="/welcome" className="hover:text-white">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}

function titleName(): string {
  try {
    return productConfig().productName
  } catch {
    return 'GameDayOps College'
  }
}

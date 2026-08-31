import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'
import { productConfig } from '../../product'

type Mode = 'signin' | 'signup' | 'reset'

/** Email/password auth screen for the admin. Board & TV display stay public. */
export default function LoginPage() {
  const { signIn, signUp, resetPassword, authAvailable } = useAuth()
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
      } else if (mode === 'signup') {
        const { error, needsConfirm } = await signUp(email, password)
        if (error) setMsg(error)
        else if (needsConfirm) setMsg('Account created — check your email to confirm, then sign in.')
        else nav('/admin')
      } else {
        const { error } = await signIn(email, password)
        if (error) setMsg(error)
        else nav('/admin')
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
            {mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in to your admin'}
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
              placeholder="Password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 outline-none focus:border-emerald-400"
            />
          )}
          <button
            type="submit" disabled={busy || !authAvailable}
            className="rounded-lg bg-emerald-500 px-4 py-3 font-bold uppercase tracking-wide text-navy-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? '…' : mode === 'signup' ? 'Start Free Trial' : mode === 'reset' ? 'Send Reset Link' : 'Sign In'}
          </button>
        </form>

        {msg && <p className="mt-3 text-center text-sm text-slate-300">{msg}</p>}

        <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
          {mode !== 'signin' ? (
            <button onClick={() => setMode('signin')} className="hover:text-white">← Sign in</button>
          ) : (
            <button onClick={() => setMode('reset')} className="hover:text-white">Forgot password?</button>
          )}
          {mode !== 'signup' ? (
            <button onClick={() => setMode('signup')} className="hover:text-white">Create account →</button>
          ) : (
            <span />
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <Link to="/" className="hover:text-white">← Back to board</Link>
        </div>
      </div>
    </div>
  )
}

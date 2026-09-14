import { useState } from 'react'
import { useAuth } from '../../context/AuthProvider'
import { productConfig } from '../../product'

/**
 * Shown on top of everything after a user opens a password-reset link (H2). The
 * reset link signs them in with a recovery session and fires PASSWORD_RECOVERY,
 * which AuthProvider captures; this overlay collects the new password and calls
 * updateUser. Rendered globally so it works no matter which route the link
 * happened to land on.
 */
export default function RecoveryOverlay() {
  const { recovery, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  if (!recovery) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (password.length < 8) return setMsg('Use at least 8 characters.')
    if (password !== confirm) return setMsg('Passwords do not match.')
    setBusy(true)
    try {
      const { error } = await updatePassword(password)
      if (error) setMsg(error)
      else setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#05070f]/95 px-6 text-white backdrop-blur">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <div className="font-display text-2xl font-extrabold uppercase tracking-wide">
            {productConfig().productName}
          </div>
          <p className="mt-1 text-sm text-slate-400">Set a new password</p>
        </div>

        {done ? (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-center text-sm text-emerald-200">
            Password updated. You’re signed in.
            <a href="#/" className="mt-3 block font-bold text-white hover:underline">Open the app →</a>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="New password" autoComplete="new-password"
              className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 outline-none focus:border-emerald-400"
            />
            <input
              type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password" autoComplete="new-password"
              className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 outline-none focus:border-emerald-400"
            />
            <button
              type="submit" disabled={busy}
              className="rounded-lg bg-emerald-500 px-4 py-3 font-bold uppercase tracking-wide text-navy-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? '…' : 'Update password'}
            </button>
            {msg && <p className="text-center text-sm text-amber-300">{msg}</p>}
          </form>
        )}
      </div>
    </div>
  )
}

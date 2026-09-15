import { useState } from 'react'

const SUPPORT_EMAIL = 'support@pregameopscfb.app'

/**
 * Lightweight support/demo contact form. Composes a message to the support
 * inbox (no backend/CRM required) and confirms in-place. Keeps "talk to us"
 * simple for launch.
 */
export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [school, setSchool] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const canSend = !!name.trim() && !!email.trim() && !!message.trim()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSend) return
    const subject = `GameDayOps College — inquiry from ${name.trim()}${school.trim() ? ` (${school.trim()})` : ''}`
    const body = [
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      `School / Program: ${school.trim() || '—'}`,
      '',
      message.trim(),
    ].join('\n')
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  const input = 'rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-white outline-none focus:border-emerald-400'

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-sm text-emerald-100">
        Thanks — your email app should have opened with your message ready to send. If it didn’t, email us directly at{' '}
        <a className="font-bold underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <input className={input} placeholder="School / Program" value={school} onChange={(e) => setSchool(e.target.value)} />
      <textarea className={`${input} min-h-[120px] resize-y`} placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} required />
      <button
        type="submit"
        disabled={!canSend}
        className="self-start rounded-full bg-emerald-500 px-7 py-3 font-extrabold uppercase tracking-wide text-navy-950 hover:bg-emerald-400 disabled:opacity-40"
      >
        Send message
      </button>
      <p className="text-xs text-slate-500">
        Prefer email? Reach us at{' '}
        <a className="text-emerald-300 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </form>
  )
}

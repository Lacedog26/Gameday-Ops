import type { ReactNode } from 'react'

/** Shared building blocks for the admin console (keeps sections consistent). */

export function Section({
  title,
  subtitle,
  children,
  accent,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  accent?: 'red' | 'blue'
}) {
  const bar = accent === 'red' ? 'bg-bills-red' : 'bg-bills-royal'
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-navy-900/60">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
        <span className={`h-6 w-1.5 rounded-full ${bar}`} />
        <div>
          <h2 className="font-display text-xl font-extrabold uppercase tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  )
}

const inputBase =
  'w-full rounded-lg border border-white/15 bg-navy-950/80 px-3 py-2 text-white outline-none transition focus:border-bills-royal focus:ring-2 focus:ring-bills-royal/40'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'success'
}) {
  const styles: Record<string, string> = {
    primary: 'bg-bills-royal hover:bg-bills-royal/80 text-white',
    ghost: 'bg-white/10 hover:bg-white/20 text-white',
    danger: 'bg-bills-red hover:bg-bills-red/85 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  }
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-bold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    />
  )
}

export function IconButton({
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-slate-200 transition hover:bg-white/20 disabled:opacity-30 ${className}`}
    />
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-navy-950/60 px-4 py-2.5"
    >
      <span className="text-sm font-semibold">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-white/20'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

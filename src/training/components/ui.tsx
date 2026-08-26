import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

// ---------------------------------------------------------------------------
// Shared primitives for the Training & Anatomy module. Small, unopinionated,
// and consistent — the visual language lives here rather than being re-typed
// into every page.
// ---------------------------------------------------------------------------

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('tr-eyebrow text-tr-dim', className)}>{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
        <h1 className="tr-display text-[clamp(30px,4.4vw,46px)] text-tr-text">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-tr-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function SectionTitle({ children, hint, actions }: { children: ReactNode; hint?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="tr-display text-[19px] tracking-wide text-tr-text">{children}</h2>
        {hint ? <p className="mt-1 text-[12.5px] text-tr-dim">{hint}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}

export function Card({ children, className, as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'article' | 'section' }) {
  return <As className={cx('tr-card rounded-md', className)}>{children}</As>
}

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-[3px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-tr-accent text-[#04120E] hover:bg-[#2CF0C0]',
  ghost: 'text-tr-muted hover:bg-tr-hi hover:text-tr-text',
  outline: 'border border-tr-line2 text-tr-text hover:border-tr-accent hover:text-tr-accent',
  danger: 'border border-[#5A2530] text-[#FF7A6B] hover:bg-[#2A1418] hover:text-[#FF9C90]',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-10 px-4 text-[13px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }>(
  function Button({ variant = 'outline', size = 'md', className, ...props }, ref) {
    return <button ref={ref} type="button" className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)} {...props} />
  },
)

/** A selectable filter chip. */
export function Chip({
  active,
  onClick,
  children,
  count,
  title,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  count?: number
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1 text-[12px] font-medium transition-colors',
        active ? 'border-tr-accent bg-[#0A2A24] text-tr-accent' : 'border-tr-line text-tr-muted hover:border-tr-line2 hover:text-tr-text',
      )}
    >
      {children}
      {count !== undefined ? <span className="tr-mono text-[10px] text-tr-dim">{count}</span> : null}
    </button>
  )
}

/** A non-interactive tag. */
export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'primary' | 'secondary' | 'stabilizer' }) {
  const tones: Record<string, string> = {
    neutral: 'border-tr-line text-tr-muted',
    accent: 'border-[#12503F] bg-[#08221C] text-tr-accent',
    primary: 'border-[#5A241E] bg-[#26100D] text-tr-primary',
    secondary: 'border-[#5A421E] bg-[#241A0D] text-tr-secondary',
    stabilizer: 'border-[#1E4A5A] bg-[#0A2028] text-tr-stabilizer',
  }
  return <span className={cx('inline-flex items-center rounded-[3px] border px-2 py-[3px] text-[11px] font-medium', tones[tone])}>{children}</span>
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  autoFocus,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  ariaLabel?: string
}) {
  return (
    <div className="relative w-full">
      <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tr-dim">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        aria-label={ariaLabel ?? placeholder}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-[3px] border border-tr-line bg-tr-surface pl-9 pr-9 text-[14px] text-tr-text placeholder:text-tr-dim focus:border-tr-accent focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-tr-dim hover:text-tr-text"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="tr-eyebrow mb-1.5 block text-tr-dim">
        {label}
        {required ? <span className="ml-1 text-tr-primary">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] text-tr-dim">{hint}</span> : null}
    </label>
  )
}

const INPUT_CLASS =
  'w-full rounded-[3px] border border-tr-line bg-tr-surface px-3 py-2 text-[14px] text-tr-text placeholder:text-tr-dim focus:border-tr-accent focus:outline-none'

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cx(INPUT_CLASS, className)} {...props} />
})

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx(INPUT_CLASS, 'min-h-[86px] resize-y leading-relaxed', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx(INPUT_CLASS, 'appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  )
})

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-4 rounded-[3px] border border-tr-line bg-tr-surface px-3 py-2.5 text-left hover:border-tr-line2"
    >
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-tr-text">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11.5px] leading-snug text-tr-dim">{hint}</span> : null}
      </span>
      <span className={cx('mt-0.5 h-5 w-9 shrink-0 rounded-full p-[2px] transition-colors', checked ? 'bg-tr-accent' : 'bg-tr-line2')}>
        <span className={cx('block h-4 w-4 rounded-full bg-[#07090E] transition-transform', checked && 'translate-x-4')} />
      </span>
    </button>
  )
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="tr-card tr-placeholder-hatch flex flex-col items-center justify-center rounded-md px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-tr-dim">{icon}</div> : null}
      <p className="tr-display text-[18px] text-tr-text">{title}</p>
      {body ? <p className="mt-2 max-w-md text-[13px] leading-relaxed text-tr-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function StatLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-tr-line py-2 last:border-b-0">
      <span className="tr-eyebrow text-tr-dim">{label}</span>
      <span className="text-right text-[13.5px] font-medium text-tr-text">{value}</span>
    </div>
  )
}

/** A clearly-labelled placeholder banner. Never used to imply finished assets. */
export function PlaceholderNote({ children }: { children: ReactNode }) {
  return (
    <div className="tr-placeholder-hatch flex items-start gap-2.5 rounded-[3px] border border-dashed border-tr-line2 bg-tr-surface/70 px-3 py-2.5">
      <svg viewBox="0 0 24 24" aria-hidden className="mt-[1px] h-4 w-4 shrink-0 text-tr-secondary">
        <path d="M12 3l9 16H3l9-16z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 10v4M12 16.5v.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <p className="text-[12px] leading-relaxed text-tr-muted">{children}</p>
    </div>
  )
}

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        d="M12 20.2s-7.4-4.6-7.4-9.6A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.4 3c0 5-7.4 9.6-7.4 9.6z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FavoriteButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      title={active ? 'Remove from favorites' : 'Add to favorites'}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-[3px] border transition-colors',
        active ? 'border-[#5A241E] bg-[#26100D] text-tr-primary' : 'border-tr-line text-tr-dim hover:border-tr-line2 hover:text-tr-text',
      )}
    >
      <HeartIcon filled={active} />
    </button>
  )
}

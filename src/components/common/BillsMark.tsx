/**
 * Generic, team-themed identity mark (a clean roundel that adopts the active
 * team's colors via CSS variables). This is an original placeholder shape — it
 * is NOT any team's trademarked logo. Upload official marks in Admin → Team
 * Brand Assets; when a primary logo is provided it is shown instead of this.
 */
export default function BillsMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Team mark">
      <circle cx="50" cy="50" r="48" style={{ fill: 'rgb(var(--team-primary))' }} />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#ffffff" strokeWidth="3" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.4" />
      <path
        d="M22 44 C24 40 30 39 34 41 C36 36 42 34 47 36 L47 33 C49 31 53 31 55 34
           C62 33 70 37 74 44 C76 48 74 53 70 55 L66 55 L67 66 L61 66 L60 56
           L40 56 L41 66 L35 66 L34 56 C28 55 23 51 22 44 Z"
        fill="#ffffff"
      />
      <path d="M30 47 L70 47 L64 51 L28 51 Z" style={{ fill: 'rgb(var(--team-secondary))' }} />
    </svg>
  )
}

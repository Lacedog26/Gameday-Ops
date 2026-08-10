/**
 * Simplified, original charging-buffalo-inspired mark (not the official logo).
 * A clean roundel in Bills royal + red so the header reads as team software
 * without redistributing trademarked artwork.
 */
export default function BillsMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Buffalo Bills">
      <circle cx="50" cy="50" r="48" fill="#00338D" />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#ffffff" strokeWidth="3" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.4" />
      {/* Charging standing-buffalo silhouette, stylised */}
      <path
        d="M22 44 C24 40 30 39 34 41 C36 36 42 34 47 36 L47 33 C49 31 53 31 55 34
           C62 33 70 37 74 44 C76 48 74 53 70 55 L66 55 L67 66 L61 66 L60 56
           L40 56 L41 66 L35 66 L34 56 C28 55 23 51 22 44 Z"
        fill="#ffffff"
      />
      {/* Red motion stripe */}
      <path d="M30 47 L70 47 L64 51 L28 51 Z" fill="#C60C30" />
    </svg>
  )
}

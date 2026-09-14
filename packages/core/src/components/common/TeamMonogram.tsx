/**
 * Neutral placeholder shown when a team has no logo configured yet. It is NOT a
 * generated/fake logo — just the team's own abbreviation on a team-tinted chip,
 * making "no logo uploaded" an obvious, clean, editable state. An authorized
 * admin replaces it by uploading the real mark in Admin → Team Branding.
 */
export default function TeamMonogram({
  abbr,
  className = '',
}: {
  abbr: string
  className?: string
}) {
  return (
    <div
      className={`grid place-items-center rounded-2xl border border-white/20 bg-team-primary/25 ${className}`}
      aria-label={`${abbr} (no logo set)`}
    >
      <span className="font-display font-extrabold uppercase tracking-tight text-white/90 text-[2.2vh] leading-none">
        {abbr}
      </span>
    </div>
  )
}

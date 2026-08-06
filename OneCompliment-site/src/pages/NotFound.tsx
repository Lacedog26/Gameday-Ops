import { Link, useLocation } from 'react-router-dom'
import { Brand } from '../components/Brand'

/**
 * Catch-all route. Matches anything React Router didn't.
 *
 * Common landing patterns we want to handle gracefully:
 *   - Mistyped /c/<id> share links (UUID typos in iMessage forwards)
 *   - Old `/onecompliment-org.html` etc. links from the legacy static
 *     site that some emails / posts still reference (Pro page mentions
 *     this, mobile DoneScreen opens onecompliment-org.html)
 *   - Anyone manually URL-typing their way around
 *
 * Keeps the same shell as Privacy / Pro / Compliment so users don't
 * feel ejected from the app — just a 🌻-shaped soft landing back to
 * the daily challenge.
 */
export default function NotFound() {
  const location = useLocation()

  // Soft-redirect hints for the legacy static URLs the previous version
  // of onecompliment.app served. These are mentioned in the codebase
  // (DoneScreen on mobile + a few external posts) — pointing them at
  // the new equivalents prevents a hard dead-end.
  const legacyHint = legacyTarget(location.pathname)

  return (
    <>
      <nav
        className="flex justify-between items-center"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(12,12,12,0.97)',
          borderBottom: '1px solid var(--bord)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '14px 24px',
        }}
      >
        <Brand size={13} />
        <Link
          to="/"
          style={{
            color: 'var(--faint)',
            fontSize: 13,
            textDecoration: 'none',
            border: '1px solid var(--bord)',
            borderRadius: 20,
            padding: '7px 14px',
          }}
        >
          ← Back to app
        </Link>
      </nav>

      <main
        className="oc-wrap"
        style={{ paddingTop: 64, paddingBottom: 80 }}
      >
        <div
          className="flex flex-col items-center text-center"
          style={{ gap: 18 }}
        >
          <div className="bob" style={{ fontSize: 72 }}>☀️</div>
          <div
            className="font-mono"
            style={{
              fontSize: 11,
              letterSpacing: '.25em',
              textTransform: 'uppercase',
              color: 'var(--color-gold)',
            }}
          >
            404 · page not found
          </div>
          <h1
            className="font-bold"
            style={{ fontSize: 'clamp(28px,6vw,38px)', lineHeight: 1.15 }}
          >
            That page doesn't exist (yet).
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'var(--dim)',
              lineHeight: 1.7,
              maxWidth: 380,
            }}
          >
            The link might be broken, expired (share links live for 90 days), or
            mistyped. Either way, today's compliment is one tap away.
          </p>

          {legacyHint && (
            <Link
              to={legacyHint.to}
              className="oc-btn"
              style={{
                maxWidth: 320,
                textDecoration: 'none',
                textAlign: 'center',
                background: 'var(--color-green)',
              }}
            >
              {legacyHint.label}
            </Link>
          )}

          <Link
            to="/"
            className="oc-btn"
            style={{ maxWidth: 320, textDecoration: 'none', textAlign: 'center' }}
          >
            Today compliment ☀️
          </Link>

          <div className="flex gap-3 flex-wrap justify-center" style={{ marginTop: 8 }}>
            <FootLink to="/history">📖 Recap</FootLink>
            <FootLink to="/business">🏢 For teams</FootLink>
            <FootLink to="/pro">✦ Pro</FootLink>
            <FootLink to="/about">About</FootLink>
            <FootLink to="/contact">Contact</FootLink>
            <FootLink to="/privacy">Privacy</FootLink>
          </div>

          <div
            className="font-mono"
            style={{
              fontSize: 10,
              color: 'var(--faint)',
              marginTop: 24,
              wordBreak: 'break-all',
            }}
          >
            {location.pathname}
            {location.search}
          </div>
        </div>
      </main>
    </>
  )
}

function FootLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        fontSize: 13,
        color: 'var(--dim)',
        textDecoration: 'none',
        border: '1px solid var(--bord)',
        borderRadius: 20,
        padding: '7px 14px',
      }}
    >
      {children}
    </Link>
  )
}

/** Translate legacy static-site URLs to current routes. */
function legacyTarget(path: string): { to: string; label: string } | null {
  const lower = path.toLowerCase()
  if (lower.endsWith('/onecompliment-org.html') || lower.endsWith('/teams.html')) {
    return { to: '/business', label: 'Looking for the Teams page? →' }
  }
  if (lower.endsWith('/privacy')) {
    return { to: '/privacy', label: 'Privacy policy →' }
  }
  if (lower.endsWith('/index')) {
    return { to: '/', label: 'Open the app →' }
  }
  return null
}

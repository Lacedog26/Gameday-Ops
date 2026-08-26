import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTraining } from '../state/store'
import { cx } from '../components/ui'

// ---------------------------------------------------------------------------
// App shell.
//
// The module scrolls inside `.tr-root` rather than scrolling the document,
// because the host gameday dashboard sets `body { overflow: hidden }` for its
// TV kiosk mode. Nav collapses to a drawer below the lg breakpoint.
// ---------------------------------------------------------------------------

interface NavItem {
  to: string
  label: string
  icon: JSX.Element
  end?: boolean
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const NAV: NavItem[] = [
  { to: '/train', label: 'Home', end: true, icon: icon('M4 11l8-7 8 7M6 10v9h12v-9') },
  { to: '/train/anatomy', label: '3D Anatomy', icon: icon('M12 3a2.2 2.2 0 100 4.4A2.2 2.2 0 0012 3zM12 7.4v6M8 9.5l4 1.5 4-1.5M9.5 21l2.5-7.6L14.5 21') },
  { to: '/train/library', label: 'Exercise Library', icon: icon('M4 5h7v14H4zM13 5h7v14h-7M6.5 9h2M15.5 9h2') },
  { to: '/train/muscles', label: 'Muscle Explorer', icon: icon('M6 4.5c2.5 0 3.5 2 3.5 4S8 12 8 14.5 9.5 19 12 19.5M18 4.5c-2.5 0-3.5 2-3.5 4s1.5 3.5 1.5 6-1.5 4.5-4 5') },
  { to: '/train/categories', label: 'Movement Categories', icon: icon('M4 6h6v6H4zM14 6h6v6h-6zM4 14h6v4H4zM14 14h6v4h-6z') },
  { to: '/train/programs', label: 'Programs', icon: icon('M5 4h14v16H5zM8.5 9h7M8.5 13h7M8.5 17h4') },
  { to: '/train/favorites', label: 'Favorites', icon: icon('M12 20s-7-4.3-7-9a3.9 3.9 0 017-2.4A3.9 3.9 0 0119 11c0 4.7-7 9-7 9z') },
  { to: '/train/settings', label: 'Settings', icon: icon('M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM19 12l1.8-1.4-1.7-3-2.2.7-1.9-1.1L14.6 4h-3.4l-.4 2.3-1.9 1.1-2.2-.7-1.7 3L6.8 12 5 13.4l1.7 3 2.2-.7 1.9 1.1.4 2.2h3.4l.4-2.2 1.9-1.1 2.2.7 1.7-3z') },
]

export default function TrainingLayout() {
  const location = useLocation()
  const { data } = useTraining()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the mobile drawer and jump to the top on every navigation.
  useEffect(() => {
    setDrawerOpen(false)
    document.querySelector('.tr-root')?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="tr-root" data-reduced-motion={data.settings.reducedMotion ? 'true' : 'false'}>
      <div className="mx-auto flex min-h-full w-full max-w-[1560px]">
        {/* Desktop rail */}
        <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-tr-line bg-tr-surface/60 px-3 py-5 lg:flex">
          <Brand />
          <nav className="mt-6 flex flex-col gap-0.5" aria-label="Training sections">
            {NAV.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </nav>
          <div className="mt-auto space-y-2 pt-6">
            <div className="tr-rule" />
            <Link to="/" className="block px-3 py-2 text-[12px] text-tr-dim transition-colors hover:text-tr-accent">
              ← Back to Gameday Ops
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile bar */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-tr-line bg-tr-bg/95 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-expanded={drawerOpen}
              aria-label="Toggle navigation"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[3px] border border-tr-line text-tr-muted"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                {drawerOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
            <Brand compact />
          </header>

          {drawerOpen ? (
            <nav className="border-b border-tr-line bg-tr-surface px-3 py-3 lg:hidden" aria-label="Training sections">
              {NAV.map((item) => (
                <NavItemLink key={item.to} item={item} />
              ))}
              <Link to="/" className="mt-2 block px-3 py-2 text-[12px] text-tr-dim">
                ← Back to Gameday Ops
              </Link>
            </nav>
          ) : null}

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-9 lg:py-9">
            <Outlet />
          </main>

          <footer className="border-t border-tr-line px-4 py-5 text-[11px] leading-relaxed text-tr-dim sm:px-6 lg:px-9">
            <p className="max-w-3xl">
              Personal training and anatomy reference. Content is organisational coaching information, not medical advice — the return-to-play
              category is a way of sequencing training complexity, not a diagnostic or clearance tool.
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/train" className="flex items-center gap-2.5 px-1">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[3px] border border-tr-accent/40 bg-[#08221C]">
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 text-tr-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 9v6M20 9v6M7 7v10M17 7v10M7 12h10" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="tr-display block text-[15px] leading-none tracking-wide text-tr-text">Training &amp; Anatomy</span>
        {!compact ? <span className="tr-eyebrow mt-1 block text-tr-dim">Performance Lab</span> : null}
      </span>
    </Link>
  )
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-[13.5px] font-medium transition-colors',
          isActive ? 'bg-[#0A2A24] text-tr-accent' : 'text-tr-muted hover:bg-tr-hi hover:text-tr-text',
        )
      }
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

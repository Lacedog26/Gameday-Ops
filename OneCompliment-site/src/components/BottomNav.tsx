import { Link, useLocation } from 'react-router-dom'
import { useUnreadReceived } from '../hooks/useUnreadReceived'

type Props = {
  onHome: () => void
  onGroups: () => void
  onTeams: () => void
  /** Optional — kept for backwards-compat with callers that wired a
   *  modal sheet here. The Settings tab is now a real route, so most
   *  callers can omit this. */
  onSettings?: () => void
  /** Highlights the matching tab — pass the active screen so non-route
   *  tabs (Home, Groups, Teams) lose their highlight when on /history
   *  or /settings. Route tabs detect their active state via location. */
  activeTab?: 'home' | 'groups' | 'teams' | 'settings'
}

/**
 * Five-tab bottom nav matching mobile/AppNavigator MainTabs:
 *   Home (🏠 #F5C842) · Recap (📖 #FFB347) · Groups (👥 #C3B1E1)
 *   · For Teams (🏢 #FFB347) · Settings (⚙️ #5C6BC0)
 *
 * Recap and Settings are real routes (/history, /settings) so they're
 * Links. Home / Groups / Teams are screens inside the Home state
 * machine so they trigger callbacks.
 */
export function BottomNav({ onHome, onGroups, onTeams, onSettings, activeTab }: Props) {
  const location = useLocation()
  const isRecap = location.pathname.startsWith('/history')
  const isSettings = location.pathname.startsWith('/settings')
  // Red dot on Recap when the user has unseen received compliments.
  const unreadReceived = useUnreadReceived()

  return (
    <div
      className="flex justify-around items-center"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(10,10,10,.97)',
        borderTop: '1px solid rgba(255,255,255,.10)',
        padding: '8px 4px calc(20px + env(safe-area-inset-bottom))',
        zIndex: 10,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <NavBtn
        emoji="🏠"
        label="Home"
        color="#F5C842"
        active={!isRecap && !isSettings && activeTab === 'home'}
        onClick={onHome}
      />
      <NavLinkBtn
        emoji="📖"
        label="Recap"
        color="#FFB347"
        active={isRecap}
        to="/history"
        dot={unreadReceived > 0}
      />
      <NavBtn
        emoji="👥"
        label="Groups"
        color="#C3B1E1"
        active={!isRecap && !isSettings && activeTab === 'groups'}
        onClick={onGroups}
      />
      <NavBtn
        emoji="🏢"
        label="For Teams"
        color="#FFB347"
        active={!isRecap && !isSettings && activeTab === 'teams'}
        onClick={onTeams}
      />
      {/* Settings is now a real /settings route. We still accept an
          onSettings callback (e.g. /settings page itself uses a no-op),
          but the default behaviour is to navigate. */}
      {onSettings ? (
        <NavBtn
          emoji="⚙️"
          label="Settings"
          color="#5C6BC0"
          active={isSettings || (!isRecap && activeTab === 'settings')}
          onClick={onSettings}
        />
      ) : (
        <NavLinkBtn
          emoji="⚙️"
          label="Settings"
          color="#5C6BC0"
          active={isSettings}
          to="/settings"
        />
      )}
    </div>
  )
}

const ITEM_STYLE: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--font-serif)',
  fontSize: 9,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  minHeight: 48,
  padding: '0 2px',
  flex: 1,
  letterSpacing: '.02em',
  textDecoration: 'none',
}

function NavBtn({
  emoji,
  label,
  color,
  active,
  onClick,
}: {
  emoji: string
  label: string
  color: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...ITEM_STYLE,
        color: active ? color : 'rgba(242,237,228,0.45)',
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, opacity: active ? 1 : 0.85 }}>{emoji}</span>
      <span style={{ color: active ? color : 'rgba(242,237,228,0.45)', fontWeight: active ? 700 : 500 }}>
        {label}
      </span>
    </button>
  )
}

function NavLinkBtn({
  emoji,
  label,
  color,
  active,
  to,
  dot,
}: {
  emoji: string
  label: string
  color: string
  active?: boolean
  to: string
  /** Render a small red unread dot over the icon. */
  dot?: boolean
}) {
  return (
    <Link
      to={to}
      style={{
        ...ITEM_STYLE,
        color: active ? color : 'rgba(242,237,228,0.45)',
      }}
    >
      <span style={{ position: 'relative', fontSize: 22, lineHeight: 1, opacity: active ? 1 : 0.85 }}>
        {emoji}
        {dot && (
          <span
            aria-label="unread compliments"
            style={{
              position: 'absolute',
              top: -2,
              right: -4,
              width: 9,
              height: 9,
              borderRadius: 9,
              background: '#FF5A5A',
              border: '1.5px solid rgba(10,10,10,.97)',
            }}
          />
        )}
      </span>
      <span style={{ color: active ? color : 'rgba(242,237,228,0.45)', fontWeight: active ? 700 : 500 }}>
        {label}
      </span>
    </Link>
  )
}

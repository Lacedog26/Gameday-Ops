import { Outlet } from 'react-router-dom'
import { useDashboard } from './context/DashboardContext'
import { useAutoNextGame } from './hooks/useAutoNextGame'

// Root layout. Individual routes (Dashboard / Admin) own their own chrome so
// the TV view can run truly full-bleed with zero surrounding UI. An optional
// org-uploaded background image renders as a subtle layer behind everything.
export default function App() {
  const { state } = useDashboard()
  // On open, auto-select the team's next upcoming game (respects a valid
  // current/manual selection; skipped on read-only TV displays).
  useAutoNextGame()
  const bg = state.teamBranding?.[state.game.teamId]?.backgroundImageUrl

  return (
    <div className="relative h-full w-full field-bg text-white">
      {bg && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url("${bg}")` }}
        />
      )}
      <div className="relative h-full w-full">
        <Outlet />
      </div>
    </div>
  )
}

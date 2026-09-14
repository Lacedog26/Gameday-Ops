import { Outlet } from 'react-router-dom'
import { useAutoNextGame } from './hooks/useAutoNextGame'

// Root layout. Individual routes (Dashboard / Admin) own their own chrome so
// the TV view can run truly full-bleed with zero surrounding UI.
export default function App() {
  // On open, auto-select the team's next upcoming game (respects a valid
  // current/manual selection).
  useAutoNextGame()
  return (
    <div className="h-full w-full field-bg text-white">
      <Outlet />
    </div>
  )
}

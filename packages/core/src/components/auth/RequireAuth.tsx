import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'
import { commercialMode } from '../../product'

/**
 * Authentication gate for protected routes.
 *
 * In COMMERCIAL mode (GameDayOps College: product `requireAuth: true`, or the
 * VITE_REQUIRE_AUTH safeguard) enforcement is driven by the route architecture
 * itself — NOT by an env var alone. A logged-out visitor to any wrapped route is
 * sent to /login. It also fails CLOSED: if the auth backend isn't reachable we
 * block rather than silently opening the app.
 *
 * The single-facility NFL deployment (no `requireAuth`) is unaffected: routes
 * stay open exactly as before.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, authAvailable } = useAuth()
  const location = useLocation()

  if (!commercialMode()) return <>{children}</>

  // Commercial mode but no backend configured → do not expose the app.
  if (!authAvailable) {
    return (
      <div className="grid min-h-full place-items-center bg-[#05070f] px-6 text-center text-slate-300">
        <div>
          <div className="mb-2 font-display text-xl font-bold">Sign-in unavailable</div>
          <p className="text-sm text-slate-400">
            This deployment isn’t connected to its accounts backend yet. Please try again shortly.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="grid min-h-full place-items-center bg-[#05070f] text-slate-400">Loading…</div>
  }
  if (!user) {
    // Preserve where they were headed so login can bounce them back.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.hash }} />
  }
  return <>{children}</>
}

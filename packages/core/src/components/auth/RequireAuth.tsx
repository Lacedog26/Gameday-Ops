import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'

/**
 * Gate for admin/billing routes. Enforcement is opt-in via the VITE_REQUIRE_AUTH
 * env var so the product isn't locked before accounts exist: when off, routes
 * stay open (current behavior); when on, an unauthenticated visitor is sent to
 * /login. The board and TV display are never gated.
 */
const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH === 'true'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, authAvailable } = useAuth()

  if (!REQUIRE_AUTH || !authAvailable) return <>{children}</>
  if (loading) {
    return <div className="grid min-h-full place-items-center bg-[#05070f] text-slate-400">Loading…</div>
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

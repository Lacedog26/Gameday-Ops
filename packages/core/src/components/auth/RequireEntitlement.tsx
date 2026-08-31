import { Navigate } from 'react-router-dom'
import { useOrg } from '../../context/OrgProvider'
import { isEntitled } from '../../billing'
import { commercialMode } from '../../product'

/**
 * Entitlement gate (C2). Wraps the paid application so that a signed-in user
 * whose organization has no valid entitlement — expired trial, canceled past
 * the paid period, or no subscription — is routed to /billing to subscribe,
 * instead of being able to keep running game day.
 *
 * Runs only in commercial mode; outside it (NFL) it is a pass-through. Must be
 * used INSIDE RequireAuth so a user + org are already resolved. /billing itself
 * is deliberately NOT wrapped, so an expired user can always reach it to pay.
 *
 * This is the client half of defense-in-depth; server-side RLS (org_entitled in
 * migration 0008) independently blocks writes even if this gate is bypassed.
 */
export default function RequireEntitlement({ children }: { children: React.ReactNode }) {
  const { org, subscription, loading } = useOrg()

  if (!commercialMode()) return <>{children}</>

  // Hold until the org has actually resolved — gating on `org` (not on
  // `subscription`) avoids both a premature redirect before resolution starts
  // and an infinite spinner when an org legitimately has no subscription row.
  if (loading || !org) {
    return <div className="grid min-h-full place-items-center bg-[#05070f] text-slate-400">Loading…</div>
  }

  if (!isEntitled(subscription ?? undefined)) return <Navigate to="/billing" replace />
  return <>{children}</>
}

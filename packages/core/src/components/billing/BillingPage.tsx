import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'
import { useOrg } from '../../context/OrgProvider'
import { isEntitled } from '../../billing'
import { productConfig } from '../../product'
import BillingSection from '../admin/BillingSection'

/**
 * Standalone billing route. Reachable with auth but WITHOUT an entitlement, so a
 * user whose trial expired (or who canceled) can always get here to subscribe /
 * reactivate. When they become entitled again, the links below let them back in.
 */
export default function BillingPage() {
  const { user, signOut } = useAuth()
  const { subscription } = useOrg()
  const entitled = isEntitled(subscription ?? undefined)

  return (
    <div className="min-h-full bg-[#05070f] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="font-display text-lg font-extrabold uppercase tracking-wide">
          {productConfig().productName}
        </div>
        <div className="flex items-center gap-2">
          {entitled && (
            <Link
              to="/"
              className="rounded-full bg-team-primary px-4 py-2 text-sm font-bold tracking-wider hover:bg-team-primary/85"
            >
              Open App →
            </Link>
          )}
          {user && (
            <button
              onClick={() => signOut()}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold tracking-wider text-slate-200 hover:bg-white/10"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
        {!entitled && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            Your access is paused. Start a subscription below to unlock game-day operations. Your
            schedules, branding, and settings are safe and return the moment you subscribe.
          </div>
        )}
        <BillingSection />
      </main>
    </div>
  )
}

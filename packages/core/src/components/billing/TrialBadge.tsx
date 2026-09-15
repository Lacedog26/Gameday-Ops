import { Link } from 'react-router-dom'
import { useOrg } from '../../context/OrgProvider'
import { commercialMode } from '../../product'
import { entitlementReason, trialDaysRemaining } from '../../billing'

/**
 * Compact, non-intrusive trial/billing status pill for the app header (Part 24).
 * Shows trial days remaining (amber under 3 days) or a payment-due nudge, and
 * links to billing. Renders nothing for a healthy active subscription or outside
 * commercial mode, so it never nags a paying customer.
 */
export default function TrialBadge() {
  const { subscription } = useOrg()
  if (!commercialMode()) return null

  const reason = entitlementReason(subscription ?? undefined)
  let text = ''
  let urgent = false

  if (reason === 'trialing') {
    const days = trialDaysRemaining(subscription?.trialEndsAt)
    text = `Free trial · ${days} day${days === 1 ? '' : 's'} left`
    urgent = days <= 3
  } else if (reason === 'past_due') {
    text = 'Payment due — update card'
    urgent = true
  } else if (reason === 'canceled_grace') {
    text = 'Canceled — access ending'
    urgent = true
  } else {
    return null // active, or handled by the entitlement gate
  }

  const cls = urgent
    ? 'border-amber-400/50 bg-amber-400/10 text-amber-200'
    : 'border-white/20 bg-white/[0.04] text-slate-200'

  return (
    <Link
      to="/billing"
      title="Manage your subscription"
      className={`hidden rounded-full border px-3 py-1.5 text-xs font-bold tracking-wider hover:bg-white/10 sm:inline-block ${cls}`}
    >
      {text}
    </Link>
  )
}

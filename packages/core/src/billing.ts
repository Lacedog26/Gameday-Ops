// ---------------------------------------------------------------------------
// Commercial / billing (Stripe-ready, NOT connected). No money moves here.
//
// ONE product, ONE simple plan (per product direction): low price, low friction.
//   • GameDayOps College — $5.99/month  OR  $59.99/year
//   • 14-day free trial, no card required to start.
// Prices are CONFIGURABLE here (and via env at checkout), never hard-coded into
// UI copy. A future Stripe integration + webhook fills in the subscription.
// ---------------------------------------------------------------------------

export type BillingInterval = 'monthly' | 'annual'

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'suspended'

/** The single product plan. Prices are defaults; override via env at checkout. */
export const PLAN = {
  id: 'college',
  name: 'GameDayOps College',
  monthlyUsd: 5.99,
  annualUsd: 60,
  trialDays: 14,
  features: [
    'All FBS + FCS teams & schedules',
    'Live game-day countdown & alerts',
    'Position / group timing',
    'Team branding, logos & culture',
    'Editable pre-game templates',
    'Unlimited TV displays',
    'Schedule importer & overrides',
  ],
} as const

/** An organization's subscription (populated by the backend + a Stripe webhook). */
export interface Subscription {
  status: SubscriptionStatus
  interval?: BillingInterval
  /** Trial end (ISO) when status === 'trialing'. */
  trialEndsAt?: string
  /** Current paid period end (ISO). */
  currentPeriodEnd?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}

/** Whole days left in a trial (0 if none / ended). Pass an ISO trial end. */
export function trialDaysRemaining(trialEndsAt?: string, now = Date.now()): number {
  if (!trialEndsAt) return 0
  const ms = new Date(trialEndsAt).getTime() - now
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

/** Is the org entitled to use the product right now? */
export function isEntitled(sub?: Subscription, now = Date.now()): boolean {
  if (!sub) return false
  if (sub.status === 'active') return true
  if (sub.status === 'trialing') return trialDaysRemaining(sub.trialEndsAt, now) > 0
  return false
}

export function priceLabel(interval: BillingInterval): string {
  return interval === 'annual' ? `$${PLAN.annualUsd}/year` : `$${PLAN.monthlyUsd}/month`
}

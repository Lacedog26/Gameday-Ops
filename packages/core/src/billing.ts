// ---------------------------------------------------------------------------
// Commercial / billing. Stripe is the source of truth (checkout + webhook).
//
// ONE product, ONE simple plan (per product direction): low price, low friction.
//   • GameDayOps College — $5.99/month  OR  $60/year
//   • 14-day free trial. A credit card IS required to start. No charge today;
//     it renews automatically at the selected plan after the trial unless
//     canceled. This is the single, consistent trial policy across every
//     surface (marketing, signup, billing, Terms, Stripe checkout).
// Prices are CONFIGURABLE here (and via env at checkout), never hard-coded into
// UI copy.
// ---------------------------------------------------------------------------

export type BillingInterval = 'monthly' | 'annual'

export type SubscriptionStatus =
  | 'incomplete'
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
    'Every FBS & FCS program selectable',
    'Live game-day countdown & alerts',
    'Position / group timing',
    'Team branding, logos & culture',
    'Editable pre-game templates',
    'Multiple TV displays',
    'Schedule importer (screenshot, CSV, PDF, paste)',
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

/**
 * Is the org entitled to use the paid product right now?
 *
 *  • active                → yes
 *  • past_due              → yes (grace: card retry in progress; portal fixes it)
 *  • trialing              → yes while the trial window is open
 *  • canceled (in period)  → yes until current_period_end
 *  • otherwise             → no (expired / suspended / trial over / none)
 */
export function isEntitled(sub?: Subscription, now = Date.now()): boolean {
  if (!sub) return false
  if (sub.status === 'active' || sub.status === 'past_due') return true
  if (sub.status === 'trialing') return trialDaysRemaining(sub.trialEndsAt, now) > 0
  if (sub.status === 'canceled') {
    return sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() > now : false
  }
  return false
}

export type EntitlementReason =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled_grace'
  | 'trial_expired'
  | 'canceled'
  | 'none'

/** Why the org is / isn't entitled — drives gating redirects and banners. */
export function entitlementReason(sub?: Subscription, now = Date.now()): EntitlementReason {
  if (!sub) return 'none'
  if (sub.status === 'active') return 'active'
  if (sub.status === 'past_due') return 'past_due'
  if (sub.status === 'trialing') {
    return trialDaysRemaining(sub.trialEndsAt, now) > 0 ? 'trialing' : 'trial_expired'
  }
  if (sub.status === 'canceled') {
    return sub.currentPeriodEnd && new Date(sub.currentPeriodEnd).getTime() > now
      ? 'canceled_grace'
      : 'canceled'
  }
  return 'none'
}

export function priceLabel(interval: BillingInterval): string {
  return interval === 'annual' ? `$${PLAN.annualUsd}/year` : `$${PLAN.monthlyUsd}/month`
}

/**
 * The ONE trial policy statement, reused verbatim across marketing, signup,
 * billing, and Terms so the customer never sees conflicting language.
 */
export const TRIAL_POLICY = {
  short: `${PLAN.trialDays}-day free trial · credit card required · no charge today`,
  sentence:
    `Start your ${PLAN.trialDays}-day free trial today. A credit card is required to start, ` +
    `but you won't be charged today. After the trial your plan renews automatically ` +
    `($${PLAN.monthlyUsd}/month or $${PLAN.annualUsd}/year) unless you cancel first. Cancel anytime.`,
  afterTrial:
    `When your ${PLAN.trialDays}-day trial ends, your selected plan begins automatically ` +
    `unless you cancel before then. Manage or cancel anytime from Admin → Billing.`,
} as const

/** Roughly how much the annual plan saves vs paying monthly for a year. */
export const ANNUAL_SAVINGS_USD = Math.round((PLAN.monthlyUsd * 12 - PLAN.annualUsd) * 100) / 100

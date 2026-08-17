// ---------------------------------------------------------------------------
// Commercial / billing architecture (Stripe-ready, NOT connected).
//
// Data model + plan catalog for selling GameDayOps as SaaS. No payment provider
// is wired up here and no money moves — this is the shape the backend + a future
// Stripe integration fill in. Prices are CONFIGURABLE (not hard-coded final
// numbers): `priceUsdMonthly` is a suggested default an operator overrides, and
// `null` means "contact us / custom".
// ---------------------------------------------------------------------------

export type PlanId = 'free' | 'pro' | 'team' | 'enterprise'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'

export interface Plan {
  id: PlanId
  name: string
  /** Suggested monthly price (USD). null = custom / contact sales. Configurable. */
  priceUsdMonthly: number | null
  /** Included display (TV) seats. null = unlimited. */
  maxDisplays: number | null
  /** Included admin/operator users. null = unlimited. */
  maxUsers: number | null
  features: string[]
  /** Marketing blurb. */
  tagline: string
}

/** The plan catalog. Operators tune prices/limits; UI reads from here. */
export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free / Demo',
    priceUsdMonthly: 0,
    maxDisplays: 1,
    maxUsers: 2,
    tagline: 'Try GameDayOps College with a single display.',
    features: ['1 TV display', 'Full pre-game engine', 'Team branding', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceUsdMonthly: 99,
    maxDisplays: 5,
    maxUsers: 10,
    tagline: 'For a single program running game day.',
    features: ['Up to 5 displays', 'Editable schedules & templates', 'Culture graphics', 'Email support'],
  },
  {
    id: 'team',
    name: 'Team',
    priceUsdMonthly: 249,
    maxDisplays: 20,
    maxUsers: 40,
    tagline: 'Full operations across the building.',
    features: ['Up to 20 displays', 'Roles & permissions', 'Priority support', 'Audit history'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceUsdMonthly: null,
    maxDisplays: null,
    maxUsers: null,
    tagline: 'Athletic-department wide, custom terms.',
    features: ['Unlimited displays', 'SSO / SAML (roadmap)', 'Dedicated support', 'Custom onboarding'],
  },
]

/** An organization's subscription record (populated by the backend + Stripe). */
export interface Subscription {
  plan: PlanId
  status: SubscriptionStatus
  /** Trial end (ISO) when status === 'trialing'. */
  trialEndsAt?: string
  /** Current paid period end (ISO). */
  currentPeriodEnd?: string
  /** Stripe identifiers — set once billing is connected. */
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  /** Provisioned limits (may override the plan defaults per contract). */
  maxDisplays?: number | null
  maxUsers?: number | null
}

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]
}

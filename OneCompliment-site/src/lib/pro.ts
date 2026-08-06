// ── Individual Pro Stripe Payment Links ──
// Mirrors the env-overridable pattern in lib/teams.ts (getTeamStripeUrl)
// and lib/groups.ts (getGroupStripeUrl). The Pro page used to hardcode
// these constants inline, which meant rotating a Payment Link required a
// code change + redeploy instead of an env var update.
//
// Stripe Payment Link URLs are public-by-design (anyone with the URL can
// pay), so the hardcoded fallbacks are safe to commit. They get replaced
// by VITE_STRIPE_PRO_MONTHLY_URL / VITE_STRIPE_PRO_ANNUAL_URL when set.
//
// The webhook routes these payments to is_pro=true on the buyer's profile
// based on the `client_reference_id=<user_uuid>` query param the Pro page
// appends — same flow as today, just with the URL source extracted.

const STRIPE_PRO_MONTHLY_DEFAULT = 'https://buy.stripe.com/dRm5kE98q8Z7eIJdHpao801'
const STRIPE_PRO_ANNUAL_DEFAULT = 'https://buy.stripe.com/9B6cN64Sab7fgQRdHpao800'

export type ProPlan = 'monthly' | 'annual'

const STRIPE_PRO_LINKS: Record<ProPlan, string> = {
  monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_URL ?? STRIPE_PRO_MONTHLY_DEFAULT,
  annual: import.meta.env.VITE_STRIPE_PRO_ANNUAL_URL ?? STRIPE_PRO_ANNUAL_DEFAULT,
}

/**
 * Stripe Payment Link URL for an individual Pro plan. Always returns a
 * valid URL — env vars override the defaults when set.
 */
export function getProStripeUrl(plan: ProPlan): string {
  return STRIPE_PRO_LINKS[plan]
}

/**
 * Append the Supabase user_id as Stripe's `client_reference_id` so the
 * stripe-webhook function can match the purchase back to a profile.
 * Stripe Payment Links read this query param natively.
 *
 * userId is deliberately non-nullable: an earlier version silently
 * returned the bare URL when it was null, which let a user check out
 * before the session bootstrapped — Stripe took the payment but the
 * webhook had nothing to match it to. Callers must not render a
 * checkout link until they have a userId (see Pro.tsx).
 */
export function withProRef(url: string, userId: string): string {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}client_reference_id=${encodeURIComponent(userId)}`
}

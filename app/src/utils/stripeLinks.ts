// ── Stripe Payment Link helpers (mobile) ──
// Mirrors OneCompliment-site/src/lib/{teams,groups,pro}.ts. Both apps
// route to the exact same Payment Link URLs and same client_reference_id
// encoding (`team_<uuid>__<tier>`, `group_<uuid>__<tier>`) so the
// stripe-webhook handles iOS purchases identically to web purchases.
//
// Why mobile uses Stripe (not IAP) for team/group tiers:
//   - Apple takes 30% Y1 / 15% Y2+ of every IAP charge — on a $499/mo
//     enterprise tier that's $720/yr/customer the company never sees.
//   - IAP charges the individual user's Apple ID; companies can't
//     expense personal Apple charges through procurement (no PO,
//     NET-30, W-9, MSA, etc).
//   - Apple Guideline 3.1.3(b) Multiplatform Services explicitly
//     allows business/enterprise services to be sold outside IAP via
//     web checkout. Slack/Notion/Asana all do this.
// Individual Pro stays on IAP because Apple requires consumer
// subscriptions to use IAP — that catalog lives in revenuecat.ts.

// All 4 paid tiers can be purchased by either a team or a group — they share
// the team_subscription_tiers catalog server-side. The two link maps below
// only differ by env-var fallback path (groups can override per-tier).
//
// There is deliberately NO hardcoded default URL: the old fallback pointed
// every unset tier at the $3.99 individual Pro Monthly link, so an
// Enterprise ($499/mo) buyer could check out at $3.99 while the webhook —
// which trusts the client_reference_id, not the price paid — still
// activated the full tier. A tier without a configured URL returns null
// and the caller must surface "checkout unavailable" instead of opening
// another tier's checkout.
export type TierId      = 'small_group' | 'team' | 'growth' | 'enterprise';
export type GroupTierId = TierId;
export type TeamTierId  = TierId;

const STRIPE_TEAM_LINKS: Record<TeamTierId, string | undefined> = {
  small_group:
    process.env.EXPO_PUBLIC_STRIPE_SMALL_GROUP_URL ??
    process.env.EXPO_PUBLIC_STRIPE_GROUP_SMALL_URL,
  team: process.env.EXPO_PUBLIC_STRIPE_TEAM_URL,
  growth: process.env.EXPO_PUBLIC_STRIPE_GROWTH_URL,
  enterprise: process.env.EXPO_PUBLIC_STRIPE_ENTERPRISE_URL,
};

const STRIPE_GROUP_LINKS: Record<GroupTierId, string | undefined> = {
  small_group:
    process.env.EXPO_PUBLIC_STRIPE_SMALL_GROUP_URL ??
    process.env.EXPO_PUBLIC_STRIPE_GROUP_SMALL_URL,
  team:
    process.env.EXPO_PUBLIC_STRIPE_GROUP_TEAM_URL ??
    process.env.EXPO_PUBLIC_STRIPE_TEAM_URL,
  growth:
    process.env.EXPO_PUBLIC_STRIPE_GROUP_GROWTH_URL ??
    process.env.EXPO_PUBLIC_STRIPE_GROWTH_URL,
  enterprise:
    process.env.EXPO_PUBLIC_STRIPE_GROUP_ENTERPRISE_URL ??
    process.env.EXPO_PUBLIC_STRIPE_ENTERPRISE_URL,
};

export function getTeamStripeUrl(tierId: TeamTierId): string | null {
  return STRIPE_TEAM_LINKS[tierId] ?? null;
}

export function getGroupStripeUrl(tierId: GroupTierId): string | null {
  return STRIPE_GROUP_LINKS[tierId] ?? null;
}

/**
 * Encode the team_id+tier into Stripe's client_reference_id with a `team_`
 * prefix so the stripe-webhook can disambiguate from individual Pro
 * purchases (bare user_id) and group-tier purchases (`group_<uuid>__<tier>`).
 *
 * The tier_id rides along inside the same field as `team_<uuid>__<tier>`
 * so the webhook knows which tier was bought without maintaining a
 * Stripe price-ID → tier-ID lookup table.
 *
 * The separator MUST stay `__`: Stripe Payment Links only accept
 * client_reference_id values matching [a-zA-Z0-9_-] as a URL param and
 * silently drop anything else (the purchase still completes — charged
 * but never activated). `__` is unambiguous because UUIDs contain no
 * underscores and tier ids (`small_group`) only single ones.
 */
export function withTeamRef(url: string, teamId: string, tierId: TeamTierId): string {
  const sep = url.includes('?') ? '&' : '?';
  const ref = `team_${teamId}__${tierId}`;
  return `${url}${sep}client_reference_id=${encodeURIComponent(ref)}`;
}

export function withGroupRef(url: string, groupId: string, tierId: GroupTierId): string {
  const sep = url.includes('?') ? '&' : '?';
  const ref = `group_${groupId}__${tierId}`;
  return `${url}${sep}client_reference_id=${encodeURIComponent(ref)}`;
}

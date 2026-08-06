import { supabase, triggerLocationUpdate, triggerComplimentPush } from './supabase'

// ── Types — these mirror the mobile app's supabaseGroups.ts shapes
//    so the same backend RPCs return the same column names.

export type GroupInfo = {
  id: string
  name: string
  invite_code: string
  pinned_challenge: string | null
  created_at: string
  member_count: number
  my_role: 'admin' | 'member'
  my_status?: 'pending' | 'approved'
}

export type GroupMemberInfo = {
  user_id: string
  display_name: string
  color: string
  role: 'admin' | 'member'
  streak: number
  best_streak: number
  bloomed_today: boolean
}

export type FeedItem = {
  id: string
  user_id: string
  display_name: string
  color: string
  recipient_name: string
  recipient_id: string | null
  body: string
  prompt: string | null
  created_at: string
  reactions: { emoji: string; user_id: string; display_name: string }[] | null
}

export type GroupStats = {
  member_count: number
  combined_streak: number
  total_completions: number
  today_completions: number
}

// ── Mutations ─────────────────────────────────────────────────
export type CreateGroupError =
  | { kind: 'email_required'; message: string }
  | { kind: 'auth'; message: string }
  | { kind: 'group_limit'; message: string }
  | { kind: 'other'; message: string }

export async function createGroup(
  name: string,
  displayName: string,
): Promise<
  | { ok: true; group_id: string; invite_code: string }
  | { ok: false; error: CreateGroupError }
> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_display_name: displayName,
  })
  if (error) {
    console.error('Create group error:', error)
    // The deployed RPC raises specific exceptions we can route on:
    //   "Link an email in Settings before creating a group."
    //   "Not authenticated"
    //   "Free accounts can join up to 8 groups. Upgrade to Pro…" (20260617)
    // Anything else is bubbled as 'other' with the raw message so the
    // user at least sees what the server complained about.
    const msg = error.message ?? ''
    if (/link an email/i.test(msg)) {
      return { ok: false, error: { kind: 'email_required', message: msg } }
    }
    if (/not authenticated/i.test(msg)) {
      return { ok: false, error: { kind: 'auth', message: msg } }
    }
    // The free-tier group cap. Route it as its own kind so callers can show
    // a Pro upsell with a link to /pro instead of a dead-end raw error —
    // Pro unlocks unlimited groups (user_is_pro → user_at_group_limit=false).
    if (/up to \d+ groups/i.test(msg) || /unlimited groups/i.test(msg)) {
      return { ok: false, error: { kind: 'group_limit', message: msg } }
    }
    return { ok: false, error: { kind: 'other', message: msg || 'Failed to create the group.' } }
  }
  const row = data as { group_id?: string; invite_code?: string } | null
  if (!row?.group_id || !row?.invite_code) {
    return { ok: false, error: { kind: 'other', message: 'Server returned an empty response.' } }
  }
  return { ok: true, group_id: row.group_id, invite_code: row.invite_code }
}

export async function joinGroup(
  inviteCode: string,
  displayName: string,
): Promise<{ group_id?: string; group_name?: string; error?: string }> {
  const { data, error } = await supabase.rpc('join_group', {
    p_invite_code: inviteCode.toUpperCase().trim(),
    p_display_name: displayName,
  })
  if (error) return { error: error.message }
  const result = data as { group_id?: string; group_name?: string; error?: string }
  if (result?.error) return { error: result.error }
  return { group_id: result.group_id, group_name: result.group_name }
}

export async function leaveGroup(groupId: string): Promise<boolean> {
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId })
  if (error) {
    console.error('Leave group error:', error)
    return false
  }
  return true
}

export async function removeGroupMember(groupId: string, targetUserId: string): Promise<boolean> {
  const { error } = await supabase.rpc('remove_group_member', {
    p_group_id: groupId,
    p_target_user_id: targetUserId,
  })
  if (error) {
    console.warn('Remove member error:', error.message)
    return false
  }
  return true
}

export type PendingGroupMember = {
  user_id: string
  display_name: string
  color: string
  joined_at: string
}

export async function getGroupPendingMembers(groupId: string): Promise<PendingGroupMember[]> {
  const { data, error } = await supabase.rpc('get_group_pending_members', { p_group_id: groupId })
  if (error) {
    console.warn('Pending group members error:', error.message)
    return []
  }
  return (data as PendingGroupMember[]) ?? []
}

export async function approveGroupMember(groupId: string, targetUserId: string): Promise<boolean> {
  const { error } = await supabase.rpc('approve_group_member', {
    p_group_id: groupId,
    p_target_user_id: targetUserId,
  })
  if (error) {
    console.warn('Approve group member error:', error.message)
    return false
  }
  return true
}

export async function renameGroup(groupId: string, name: string): Promise<boolean> {
  const { error } = await supabase.rpc('rename_group', { p_group_id: groupId, p_name: name })
  if (error) return false
  return true
}

export async function updateGroupDisplayName(
  groupId: string,
  displayName: string,
): Promise<boolean> {
  const { error } = await supabase.rpc('update_my_display_name', {
    p_group_id: groupId,
    p_display_name: displayName,
  })
  if (error) return false
  return true
}

// ── Reads ─────────────────────────────────────────────────────
export async function loadMyGroups(): Promise<GroupInfo[]> {
  const { data, error } = await supabase.rpc('load_my_groups')
  if (error) {
    console.error('Load groups error:', error)
    return []
  }
  if (!data) return []
  return (data as GroupInfo[]).map((g) => ({
    id: g.id,
    name: g.name,
    invite_code: g.invite_code,
    pinned_challenge: g.pinned_challenge,
    created_at: g.created_at,
    member_count: g.member_count,
    my_role: g.my_role,
    my_status: g.my_status ?? 'approved',
  }))
}

export async function getGroupLeaderboard(groupId: string): Promise<GroupMemberInfo[]> {
  const { data, error } = await supabase.rpc('get_group_leaderboard', { p_group_id: groupId })
  if (error) {
    console.error('Leaderboard error:', error)
    return []
  }
  return (data as GroupMemberInfo[]) ?? []
}

export async function getGroupFeed(groupId: string, limit = 50): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_group_feed', { p_group_id: groupId, p_limit: limit })
  if (error) {
    console.error('Feed error:', error)
    return []
  }
  return (data as FeedItem[]) ?? []
}

export async function getGroupStats(groupId: string): Promise<GroupStats | null> {
  const { data, error } = await supabase.rpc('get_group_stats', { p_group_id: groupId })
  if (error) {
    console.error('Stats error:', error)
    return null
  }
  return data as GroupStats
}

// Posts a compliment to a single group. The Home submit flow fans out
// across all of the user's groups so each receives a copy in its feed.
export async function postGroupCompliment(
  groupId: string,
  body: string,
  recipientName: string,
  recipientId: string | null,
  prompt: string | null,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('submit_group_compliment', {
    p_group_id: groupId,
    p_body: body,
    p_recipient_name: recipientName,
    p_recipient_id: recipientId,
    p_prompt: prompt,
  })
  if (error) {
    console.warn('Post compliment error:', error.message)
    return false
  }
  const completionId = (data as { completion_id?: string } | null)?.completion_id ?? null
  if (completionId) {
    triggerLocationUpdate()
    triggerComplimentPush(completionId, 'group')
  }
  return Boolean(completionId)
}

export async function toggleReaction(
  completionId: string,
  emoji = '❤️',
): Promise<'added' | 'removed' | null> {
  const { data, error } = await supabase.rpc('toggle_reaction', {
    p_completion_id: completionId,
    p_emoji: emoji,
  })
  if (error) {
    console.error('Toggle reaction error:', error)
    return null
  }
  return (data as { action?: 'added' | 'removed' })?.action ?? null
}

// Build a full URL the user can paste anywhere — same shape as the
// mobile email invites, landing on the Join page which enforces the
// username/email gates join_group expects. The old `?join=CODE`
// shape is still redirected here by Home for links already shared.
export function buildJoinUrl(inviteCode: string): string {
  return `https://onecompliment.app/join/group/${inviteCode}`
}

// ── Subscription / tier (mirrors team_subscription_tiers) ────────
// `get_group_subscription` returns a single row joining groups +
// group_subscriptions + team_subscription_tiers, so subscription
// columns are nullable when the group is on the free plan.

export type GroupTierId = 'small_group' | 'team' | 'growth' | 'enterprise'

export type GroupSubscription = {
  tier_id: GroupTierId | null
  tier_name: string | null
  max_members: number | null
  price_monthly: number | null
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  member_limit: number
  subscription_tier: string | null
  current_members: number
}

export async function loadGroupSubscription(groupId: string): Promise<GroupSubscription | null> {
  const { data, error } = await supabase.rpc('get_group_subscription', { p_group_id: groupId })
  if (error) {
    console.warn('Group subscription error:', error.message)
    return null
  }
  return (data as GroupSubscription) ?? null
}

export async function activateGroupSubscription(
  groupId: string,
  tierId: GroupTierId,
  externalId?: string,
): Promise<{ tier: string; max_members: number | null; price: number } | { error: string }> {
  const { data, error } = await supabase.rpc('activate_group_subscription', {
    p_group_id: groupId,
    p_tier_id: tierId,
    p_external_id: externalId ?? null,
  })
  if (error) return { error: error.message }
  return data as { tier: string; max_members: number | null; price: number }
}

export type GroupTierInfo = {
  id: GroupTierId
  name: string
  priceMonthly: number
  maxMembers: number | null
  stripeUrl: string | null
}

// ── Group-tier Stripe Payment Links ──
// One Payment Link per tier, from env. Deliberately NO hardcoded
// fallback: the old default pointed every unset tier at the $3.99
// individual Pro Monthly link, so a buyer could check out at the wrong
// price while the webhook — which trusts the group_<uuid>__<tier>
// client_reference_id, not the price paid — still activated the tier.
// A tier without a configured URL returns null and the UI must collapse
// to "Talk to sales".
//
// Group-specific env vars take priority; team URL env vars are the next
// fallback so a single set of Payment Links can drive both audiences
// during rollout.
const STRIPE_GROUP_LINKS: Record<string, string | undefined> = {
  small_group:
    import.meta.env.VITE_STRIPE_SMALL_GROUP_URL ??
    import.meta.env.VITE_STRIPE_GROUP_SMALL_URL,
  team:
    import.meta.env.VITE_STRIPE_GROUP_TEAM_URL ??
    import.meta.env.VITE_STRIPE_TEAM_URL,
  growth:
    import.meta.env.VITE_STRIPE_GROUP_GROWTH_URL ??
    import.meta.env.VITE_STRIPE_GROWTH_URL,
  enterprise:
    import.meta.env.VITE_STRIPE_GROUP_ENTERPRISE_URL ??
    import.meta.env.VITE_STRIPE_ENTERPRISE_URL,
}

/**
 * Stripe Payment Link URL for a given group tier id, or null when no
 * Payment Link is configured for it — callers must treat null as
 * "checkout unavailable", never substitute another tier's URL.
 */
export function getGroupStripeUrl(tierId: string): string | null {
  return STRIPE_GROUP_LINKS[tierId] ?? null
}

/**
 * Group tier catalog. Stripe Payment Link URLs come from env vars —
 * separate from the team URLs so finance can issue distinct prices /
 * tax behaviour per audience even though the underlying tier rows live
 * in `team_subscription_tiers` (shared catalog).
 *
 * Falls back to `VITE_STRIPE_<TIER>_URL` when a group-specific URL
 * isn't set, so a single set of Payment Links can drive both flows
 * during the rollout. When neither is set, the tier card shows a
 * "Talk to sales" link instead of a broken upgrade button.
 */
export function getGroupTiers(): GroupTierInfo[] {
  const env = import.meta.env
  return [
    {
      id: 'small_group',
      name: 'Small Group',
      priceMonthly: 9.99,
      maxMembers: 25,
      stripeUrl: env.VITE_STRIPE_SMALL_GROUP_URL ?? env.VITE_STRIPE_GROUP_SMALL_URL ?? null,
    },
    {
      id: 'team',
      name: 'Team',
      priceMonthly: 99,
      maxMembers: 100,
      stripeUrl: env.VITE_STRIPE_GROUP_TEAM_URL ?? env.VITE_STRIPE_TEAM_URL ?? null,
    },
    {
      id: 'growth',
      name: 'Growth',
      priceMonthly: 299,
      maxMembers: 500,
      stripeUrl: env.VITE_STRIPE_GROUP_GROWTH_URL ?? env.VITE_STRIPE_GROWTH_URL ?? null,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      priceMonthly: 499,
      maxMembers: null,
      stripeUrl: env.VITE_STRIPE_GROUP_ENTERPRISE_URL ?? env.VITE_STRIPE_ENTERPRISE_URL ?? null,
    },
  ]
}

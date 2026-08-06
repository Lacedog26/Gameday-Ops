import { supabase, triggerLocationUpdate, triggerComplimentPush } from './supabase'

// ── Types — mirror the mobile Team* shapes from
//    OneComplimentApp/src/utils/supabase.ts so RPC payloads round-trip
//    cleanly between the two clients.

export type TeamType = 'school' | 'organization' | 'general'

export interface Team {
  id: string
  name: string
  team_type: TeamType
  invite_code: string
  description: string | null
  pinned_challenge: string | null
  daily_theme: string | null
  require_approval: boolean
  shared_visibility: boolean
  content_filter_enabled: boolean
  parent_visibility: boolean
  custom_prompts_only: boolean
  member_limit: number | null
  subscription_tier: string
  created_at: string
  my_role: 'admin' | 'moderator' | 'member'
  my_status: 'pending' | 'approved'
  team_status: 'pending' | 'approved' | 'rejected'
  team_rejection_reason: string | null
  member_count: number
  today_completions: number
  pending_count: number
  team_streak: number
}

export interface TeamMember {
  user_id: string
  display_name: string
  color: string
  role: 'admin' | 'moderator' | 'member'
  muted: boolean
  streak: number
  bloomed_today: boolean
}

export interface TeamCompletion {
  id: string
  user_id: string
  display_name: string
  color: string
  recipient_name: string
  body: string
  prompt: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface TeamStreak {
  current_streak: number
  longest_streak: number
  last_completed_on: string | null
}

export interface TeamDashboard {
  team: Team
  members: TeamMember[]
  feed: TeamCompletion[]
  pending: TeamCompletion[]
  stats: {
    member_count: number
    today_completions: number
    total_completions: number
    completion_rate: number
    pending_count: number
  }
  team_streak: TeamStreak | null
}

export interface PendingTeamMember {
  user_id: string
  display_name: string
  color: string
  joined_at: string
}

// ── Mutations ─────────────────────────────────────────────────
export async function createTeam(opts: {
  name: string
  teamType: TeamType
  displayName: string
  description?: string
}): Promise<{ team_id: string; invite_code: string } | { error: string }> {
  const { data, error } = await supabase.rpc('create_team', {
    p_name: opts.name,
    p_team_type: opts.teamType,
    p_display_name: opts.displayName,
    p_description: opts.description ?? null,
  })
  if (error) return { error: error.message }
  return data as { team_id: string; invite_code: string }
}

export async function joinTeam(
  inviteCode: string,
  displayName: string,
): Promise<{ team_id: string; team_name: string; team_type: string } | { error: string }> {
  const { data, error } = await supabase.rpc('join_team', {
    p_invite_code: inviteCode.toUpperCase().trim(),
    p_display_name: displayName,
  })
  if (error) return { error: error.message }
  if (data?.error) return { error: data.error }
  return data
}

export async function leaveTeam(teamId: string): Promise<boolean> {
  const { error } = await supabase.rpc('leave_team', { p_team_id: teamId })
  if (error) {
    console.error('Leave team error:', error)
    return false
  }
  return true
}

export async function submitTeamCompletion(opts: {
  teamId: string
  body: string
  recipientName: string
  prompt?: string
}): Promise<{ completion_id: string; status: string } | { error: string }> {
  const { data, error } = await supabase.rpc('submit_team_completion', {
    p_team_id: opts.teamId,
    p_body: opts.body,
    p_recipient_name: opts.recipientName,
    p_prompt: opts.prompt ?? null,
  })
  if (error) return { error: error.message }
  if (data?.error) return { error: data.error }
  triggerLocationUpdate()
  // Fire-and-forget. On approval-required teams the Edge Function returns
  // skipped:'pending-moderation' and the moderator-approval path
  // (moderateCompletion) re-invokes it after status flips to 'approved'.
  const completionId = (data as { completion_id?: string } | null)?.completion_id
  if (completionId) triggerComplimentPush(completionId, 'team')
  return data
}

// ── Reads ─────────────────────────────────────────────────────
export async function loadMyTeams(): Promise<Team[]> {
  const { data, error } = await supabase.rpc('load_my_teams')
  if (error) {
    console.warn('Load teams error:', error.message)
    return []
  }
  return (data as Team[]) ?? []
}

export async function loadTeamDashboard(teamId: string): Promise<TeamDashboard | null> {
  const { data, error } = await supabase.rpc('get_team_dashboard', { p_team_id: teamId })
  if (error) {
    console.warn('Dashboard error:', error.message)
    return null
  }
  return data as TeamDashboard | null
}

// ── Moderation (admin / moderator only) ───────────────────────
export async function getTeamPendingMembers(teamId: string): Promise<PendingTeamMember[]> {
  const { data, error } = await supabase.rpc('get_team_pending_members', { p_team_id: teamId })
  if (error) {
    console.warn('Pending members error:', error.message)
    return []
  }
  return (data as PendingTeamMember[]) ?? []
}

export async function approveTeamMember(teamId: string, targetUserId: string): Promise<boolean> {
  const { error } = await supabase.rpc('approve_team_member', {
    p_team_id: teamId,
    p_target_user_id: targetUserId,
  })
  if (error) {
    console.warn('Approve member error:', error.message)
    return false
  }
  return true
}

export async function removeTeamMember(teamId: string, targetUserId: string): Promise<boolean> {
  const { error } = await supabase.rpc('remove_team_member', {
    p_team_id: teamId,
    p_target_user_id: targetUserId,
  })
  if (error) {
    console.warn('Remove member error:', error.message)
    return false
  }
  return true
}

export async function moderateCompletion(
  completionId: string,
  action: 'approve' | 'reject',
  reason?: string,
): Promise<boolean> {
  const { error } = await supabase.rpc('moderate_team_completion', {
    p_completion_id: completionId,
    p_action: action,
    p_reason: reason ?? null,
  })
  if (error) {
    console.warn('Moderate completion error:', error.message)
    return false
  }
  // Fire the push that was held back at submit time. Server-side allows
  // moderator-as-caller when status='approved'.
  if (action === 'approve') triggerComplimentPush(completionId, 'team')
  return true
}

// ── Subscriptions ─────────────────────────────────────────────
export type SubscriptionTier = {
  id: string
  name: string
  max_members: number | null
  price_monthly: number
}

// Mirrors the get_team_subscription RPC payload — all subscription
// columns are nullable when the team has no row in team_subscriptions
// (free / unset). current_members and member_limit always come back
// because they're joined off the teams table.
export type TeamSubscription = {
  tier_id: string | null
  tier_name: string | null
  max_members: number | null
  price_monthly: number | null
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  member_limit: number | null
  subscription_tier: string | null
  current_members: number
}

export async function loadSubscriptionTiers(): Promise<SubscriptionTier[]> {
  const { data, error } = await supabase
    .from('team_subscription_tiers')
    .select('*')
    .order('price_monthly', { ascending: true })
  if (error) {
    console.warn('Tiers error:', error.message)
    return []
  }
  return (data as SubscriptionTier[]) ?? []
}

export async function loadTeamSubscription(teamId: string): Promise<TeamSubscription | null> {
  const { data, error } = await supabase.rpc('get_team_subscription', { p_team_id: teamId })
  if (error) {
    console.warn('Subscription error:', error.message)
    return null
  }
  return (data as TeamSubscription) ?? null
}

export async function activateTeamSubscription(
  teamId: string,
  tierId: string,
  externalId?: string,
): Promise<{ tier: string; max_members: number | null; price: number } | { error: string }> {
  const { data, error } = await supabase.rpc('activate_team_subscription', {
    p_team_id: teamId,
    p_tier_id: tierId,
    p_external_id: externalId ?? null,
  })
  if (error) return { error: error.message }
  return data as { tier: string; max_members: number | null; price: number }
}

export type TeamTierId = 'small_group' | 'team' | 'growth' | 'enterprise'

export type TeamTierInfo = {
  id: TeamTierId
  name: string
  priceMonthly: number
  maxMembers: number | null
  stripeUrl: string | null
}

// ── Team-tier Stripe Payment Links ──
// One Payment Link per tier, from env. Deliberately NO hardcoded
// fallback: the old default pointed every unset tier at the $3.99
// individual Pro Monthly link, so an Enterprise ($499/mo) buyer could
// check out at $3.99 while the webhook — which trusts the
// team_<uuid>__<tier> client_reference_id, not the price paid — still
// activated the full tier. A tier without a configured URL returns
// null and the UI must collapse to "Talk to sales".
const STRIPE_TEAM_LINKS: Record<string, string | undefined> = {
  small_group:
    import.meta.env.VITE_STRIPE_SMALL_GROUP_URL ??
    import.meta.env.VITE_STRIPE_GROUP_SMALL_URL,
  team: import.meta.env.VITE_STRIPE_TEAM_URL,
  growth: import.meta.env.VITE_STRIPE_GROWTH_URL,
  enterprise: import.meta.env.VITE_STRIPE_ENTERPRISE_URL,
}

/**
 * Stripe Payment Link URL for a given team tier id, or null when no
 * Payment Link is configured for it — callers must treat null as
 * "checkout unavailable", never substitute another tier's URL.
 *
 * Used by the DB-driven tier list (loadSubscriptionTiers) so the web UI
 * matches the mobile UX of rendering tiers from team_subscription_tiers
 * while still routing each tier to its own Stripe checkout page.
 */
export function getTeamStripeUrl(tierId: string): string | null {
  return STRIPE_TEAM_LINKS[tierId] ?? null
}

/**
 * Reads tier Payment Link URLs from env. If a URL is missing, we surface
 * "Talk to sales" as the only path for that tier — keeps things shippable
 * before Joao creates the Payment Links in Stripe.
 */
export function getTeamTiers(): TeamTierInfo[] {
  return [
    {
      id: 'small_group',
      name: 'Small Group',
      priceMonthly: 9.99,
      maxMembers: 25,
      stripeUrl:
        import.meta.env.VITE_STRIPE_SMALL_GROUP_URL ??
        import.meta.env.VITE_STRIPE_GROUP_SMALL_URL ??
        null,
    },
    {
      id: 'team',
      name: 'Team',
      priceMonthly: 99,
      maxMembers: 100,
      stripeUrl: import.meta.env.VITE_STRIPE_TEAM_URL ?? null,
    },
    {
      id: 'growth',
      name: 'Growth',
      priceMonthly: 299,
      maxMembers: 500,
      stripeUrl: import.meta.env.VITE_STRIPE_GROWTH_URL ?? null,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      priceMonthly: 499,
      maxMembers: null,
      stripeUrl: import.meta.env.VITE_STRIPE_ENTERPRISE_URL ?? null,
    },
  ]
}

export type TeamSettingsPatch = {
  name?: string
  description?: string
  daily_theme?: string
  pinned_challenge?: string
  require_approval?: boolean
  shared_visibility?: boolean
  content_filter_enabled?: boolean
  parent_visibility?: boolean
  custom_prompts_only?: boolean
}

export async function updateTeamSettings(
  teamId: string,
  settings: TeamSettingsPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc('update_team_settings', {
    p_team_id: teamId,
    p_name: settings.name ?? null,
    p_description: settings.description ?? null,
    p_daily_theme: settings.daily_theme ?? null,
    p_pinned_challenge: settings.pinned_challenge ?? null,
    p_require_approval: settings.require_approval ?? null,
    p_shared_visibility: settings.shared_visibility ?? null,
    p_content_filter_enabled: settings.content_filter_enabled ?? null,
    p_parent_visibility: settings.parent_visibility ?? null,
    p_custom_prompts_only: settings.custom_prompts_only ?? null,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export function buildTeamJoinUrl(inviteCode: string): string {
  // Same shape as the mobile email invites — lands on the Join page,
  // which enforces the username/email gates join_team requires. The
  // old `/?join=CODE&type=team` shape dead-ended in Home's group-only
  // handler; Home still redirects that shape here for links already
  // shared.
  return `https://onecompliment.app/join/team/${inviteCode}`
}

// Used by CreateTeam — drives the team-type picker and Detail header.
export const TEAM_TYPE_META: Record<TeamType, { icon: string; label: string; desc: string }> = {
  general: {
    icon: '🏠',
    label: 'General',
    desc: 'Casual team for friends, family, or any group.',
  },
  organization: {
    icon: '🏢',
    label: 'Organization',
    desc: 'For companies & professional teams. No moderation.',
  },
  school: {
    icon: '🏫',
    label: 'School',
    desc: 'Teacher-moderated. COPPA/FERPA safe. Approval required.',
  },
}

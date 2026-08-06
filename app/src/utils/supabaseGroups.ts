import { supabase, triggerLocationUpdate } from './supabase';

// ── Types ─────────────────────────────────────────────────────
export interface GroupInfo {
  id: string;
  name: string;
  invite_code: string;
  pinned_challenge: string | null;
  created_at: string;
  member_count: number;
  member_limit: number; // free plan defaults to 10
  subscription_tier: string | null; // null ⇒ free plan
  my_role: 'admin' | 'member';
  // 'pending' while the admin hasn't approved a join-by-code yet.
  my_status: 'pending' | 'approved';
}

export interface PendingGroupMember {
  user_id: string;
  display_name: string;
  color: string;
  joined_at: string;
}

export interface GroupSubscription {
  tier_id: string | null;
  tier_name: string | null;
  max_members: number | null;
  price_monthly: number | null;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  member_limit: number;
  subscription_tier: string | null;
  current_members: number;
}

export interface GroupMemberInfo {
  user_id: string;
  display_name: string;
  color: string;
  role: 'admin' | 'member';
  streak: number;
  best_streak: number;
  bloomed_today: boolean;
}

export interface FeedItem {
  id: string;
  user_id: string;
  display_name: string;
  color: string;
  recipient_name: string;
  recipient_id: string | null;
  body: string;
  prompt: string | null;
  created_at: string;
  reactions: { emoji: string; user_id: string; display_name: string }[] | null;
}

export interface GroupStats {
  member_count: number;
  combined_streak: number;
  total_completions: number;
  today_completions: number;
}

// ── Create group ──────────────────────────────────────────────
export async function createGroup(
  name: string,
  displayName: string
): Promise<{ group_id: string; invite_code: string } | null> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_display_name: displayName,
  });
  if (error) {
    console.error('Create group error:', error);
    return null;
  }
  return data as { group_id: string; invite_code: string };
}

// ── Join group by invite code ─────────────────────────────────
export async function joinGroup(
  inviteCode: string,
  displayName: string
): Promise<{ group_id?: string; group_name?: string; error?: string }> {
  const { data, error } = await supabase.rpc('join_group', {
    p_invite_code: inviteCode.toUpperCase().trim(),
    p_display_name: displayName,
  });
  if (error) {
    return { error: error.message };
  }
  const result = data as any;
  if (result?.error) return { error: result.error };
  return { group_id: result.group_id, group_name: result.group_name };
}

// ── Leave group ───────────────────────────────────────────────
export async function leaveGroup(groupId: string): Promise<boolean> {
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
  if (error) {
    console.error('Leave group error:', error);
    return false;
  }
  return true;
}

// ── Remove member (admin) ─────────────────────────────────────
export async function removeMember(groupId: string, targetUserId: string): Promise<boolean> {
  const { error } = await supabase.rpc('remove_group_member', {
    p_group_id: groupId,
    p_target_user_id: targetUserId,
  });
  if (error) {
    console.error('Remove member error:', error);
    return false;
  }
  return true;
}

// ── Rename group (admin) ──────────────────────────────────────
export async function renameGroup(groupId: string, name: string): Promise<boolean> {
  const { error } = await supabase.rpc('rename_group', {
    p_group_id: groupId,
    p_name: name,
  });
  if (error) {
    console.error('Rename group error:', error);
    return false;
  }
  return true;
}

// ── Pin challenge (admin) ─────────────────────────────────────
export async function pinChallenge(groupId: string, challenge: string | null): Promise<boolean> {
  const { error } = await supabase.rpc('pin_group_challenge', {
    p_group_id: groupId,
    p_challenge: challenge ?? '',
  });
  if (error) {
    console.error('Pin challenge error:', error);
    return false;
  }
  return true;
}

// ── Load my groups ────────────────────────────────────────────
export async function loadMyGroups(): Promise<GroupInfo[]> {
  const { data, error } = await supabase.rpc('load_my_groups');
  if (error) {
    console.error('Load groups error:', error);
    return [];
  }
  if (!data) return [];
  return (data as any[]).map(g => ({
    id: g.id,
    name: g.name,
    invite_code: g.invite_code,
    pinned_challenge: g.pinned_challenge,
    created_at: g.created_at,
    member_count: g.member_count,
    member_limit: g.member_limit ?? 10,
    subscription_tier: g.subscription_tier ?? null,
    my_role: g.my_role,
    my_status: g.my_status ?? 'approved',
  }));
}

// ── Pending members (admin only) ──────────────────────────────
export async function getGroupPendingMembers(groupId: string): Promise<PendingGroupMember[]> {
  const { data, error } = await supabase.rpc('get_group_pending_members', { p_group_id: groupId });
  if (error) { console.warn('Pending members error:', error.message); return []; }
  return (data as PendingGroupMember[]) ?? [];
}

export async function approveGroupMember(groupId: string, targetUserId: string): Promise<boolean> {
  const { error } = await supabase.rpc('approve_group_member', {
    p_group_id: groupId, p_target_user_id: targetUserId,
  });
  if (error) { console.warn('Approve member error:', error.message); return false; }
  return true;
}

// ── Group subscription ────────────────────────────────────────
export async function loadGroupSubscription(groupId: string): Promise<GroupSubscription | null> {
  const { data, error } = await supabase.rpc('get_group_subscription', { p_group_id: groupId });
  if (error) {
    console.warn('Group subscription error:', error.message);
    return null;
  }
  return (data as GroupSubscription) ?? null;
}

export async function activateGroupSubscription(
  groupId: string, tierId: string, externalId?: string,
): Promise<{ tier: string; max_members: number | null; price: number } | { error: string }> {
  const { data, error } = await supabase.rpc('activate_group_subscription', {
    p_group_id: groupId, p_tier_id: tierId, p_external_id: externalId ?? null,
  });
  if (error) return { error: error.message };
  return data as { tier: string; max_members: number | null; price: number };
}

// ── Get group leaderboard ─────────────────────────────────────
export async function getGroupLeaderboard(groupId: string): Promise<GroupMemberInfo[]> {
  const { data, error } = await supabase.rpc('get_group_leaderboard', { p_group_id: groupId });
  if (error) {
    console.error('Leaderboard error:', error);
    return [];
  }
  return (data as GroupMemberInfo[]) ?? [];
}

// ── Get group feed ────────────────────────────────────────────
export async function getGroupFeed(groupId: string, limit = 50): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_group_feed', {
    p_group_id: groupId,
    p_limit: limit,
  });
  if (error) {
    console.error('Feed error:', error);
    return [];
  }
  return (data as FeedItem[]) ?? [];
}

// ── Get group stats ───────────────────────────────────────────
export async function getGroupStats(groupId: string): Promise<GroupStats | null> {
  const { data, error } = await supabase.rpc('get_group_stats', { p_group_id: groupId });
  if (error) {
    console.error('Stats error:', error);
    return null;
  }
  return data as GroupStats;
}

// ── Post a compliment to a group ──────────────────────────────
// Goes through submit_group_compliment (SECURITY DEFINER) so stale-membership
// rejects come back as { skipped } instead of RLS 42501s that LogBox surfaces
// as red error screens. Used by both the Home-tab fan-out and the in-group
// compose flow.
export async function postGroupCompliment(
  groupId: string,
  body: string,
  recipientName: string,
  recipientId: string | null,
  prompt: string | null
): Promise<boolean> {
  const { data, error } = await supabase.rpc('submit_group_compliment', {
    p_group_id: groupId,
    p_body: body,
    p_recipient_name: recipientName,
    p_recipient_id: recipientId,
    p_prompt: prompt,
  });

  if (error) {
    console.warn('Post compliment error:', error.message);
    return false;
  }
  const groupCompletionId = (data as { completion_id?: string } | null)?.completion_id;
  if (groupCompletionId) {
    triggerLocationUpdate();
    import('./notifications').then(m => m.triggerComplimentPush(groupCompletionId, 'group'));
  }
  return !!groupCompletionId;
}

// ── Toggle reaction ───────────────────────────────────────────
export async function toggleReaction(
  completionId: string,
  emoji = '❤️'
): Promise<'added' | 'removed' | null> {
  const { data, error } = await supabase.rpc('toggle_reaction', {
    p_completion_id: completionId,
    p_emoji: emoji,
  });
  if (error) {
    console.error('Toggle reaction error:', error);
    return null;
  }
  return (data as any)?.action ?? null;
}

// ── Update display name ───────────────────────────────────────
export async function updateGroupDisplayName(
  groupId: string,
  displayName: string
): Promise<boolean> {
  const { error } = await supabase.rpc('update_my_display_name', {
    p_group_id: groupId,
    p_display_name: displayName,
  });
  if (error) {
    console.error('Update display name error:', error);
    return false;
  }
  return true;
}

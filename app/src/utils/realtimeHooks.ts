import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

// Monotonic id so every hook invocation gets a unique channel name.
// Without this, two screens subscribing to the same logical channel
// (e.g. GroupsScreen + TeamsListScreen both calling
// useMyMembershipRealtime with the same userId) would collide on the
// channel name and supabase-js would throw
// "cannot add `postgres_changes` callbacks ... after `subscribe()`".
let channelSeq = 0;
const nextChannelId = () => `${Date.now().toString(36)}-${(++channelSeq).toString(36)}`;

// Strip a leading '@' so a legacy "@handle" recipient_name still matches the
// bare stored username. Safe for the email/phone callers below — emails never
// carry a leading '@' for this to remove.
const norm = (s?: unknown) => (s ?? '').toString().trim().toLowerCase().replace(/^@+/, '');
const digits = (s?: unknown) => (s ?? '').toString().replace(/\D/g, '');

/**
 * Subscribes to realtime changes on a group's membership, feed, and reactions.
 * Calls onChange() whenever anything affecting the group's displayed state
 * changes. Calls onRemoved() if the CURRENT user's membership row is deleted.
 *
 * Requires on the DB side:
 *   - tables added to `supabase_realtime` publication
 *   - `ALTER TABLE ... REPLICA IDENTITY FULL` so DELETE payload.old has user_id
 */
export function useGroupRealtime(
  groupId: string | null | undefined,
  userId: string | null | undefined,
  onChange: () => void,
  onRemoved: () => void,
) {
  const onChangeRef = useRef(onChange);
  const onRemovedRef = useRef(onRemoved);
  onChangeRef.current = onChange;
  onRemovedRef.current = onRemoved;

  useEffect(() => {
    if (!groupId || !userId) return;

    const channel = supabase
      .channel(`group-rt:${groupId}:${nextChannelId()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const oldRow = (payload as any).old;
          if (payload.eventType === 'DELETE' && oldRow?.user_id === userId) {
            onRemovedRef.current();
            return;
          }
          onChangeRef.current();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_completions', filter: `group_id=eq.${groupId}` },
        () => onChangeRef.current(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_reactions' },
        () => onChangeRef.current(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, userId]);
}

/**
 * Same as useGroupRealtime but for teams. Watches team_members (for removal),
 * team_completions (for feed), and team_streaks (for the collective counter).
 */
export function useTeamRealtime(
  teamId: string | null | undefined,
  userId: string | null | undefined,
  onChange: () => void,
  onRemoved: () => void,
) {
  const onChangeRef = useRef(onChange);
  const onRemovedRef = useRef(onRemoved);
  onChangeRef.current = onChange;
  onRemovedRef.current = onRemoved;

  useEffect(() => {
    if (!teamId || !userId) return;

    const channel = supabase
      .channel(`team-rt:${teamId}:${nextChannelId()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` },
        (payload) => {
          const oldRow = (payload as any).old;
          if (payload.eventType === 'DELETE' && oldRow?.user_id === userId) {
            onRemovedRef.current();
            return;
          }
          onChangeRef.current();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_completions', filter: `team_id=eq.${teamId}` },
        () => onChangeRef.current(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_streaks', filter: `team_id=eq.${teamId}` },
        () => onChangeRef.current(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamId, userId]);
}

/**
 * Subscribes to INSERTs on the three compliment tables (personal, group,
 * team) so the Recap tab's "Compliments Received" list updates live when
 * anyone sends a compliment addressed to the current user.
 *
 * We intentionally subscribe unfiltered — recipient_name is free-form text
 * stored as whatever the sender typed, and the RPC matches case-insensitively.
 * A server-side filter would need exact case. The onChange handler re-runs
 * the RPC which applies the proper LOWER() match; low-volume events are
 * cheap to debounce on the client.
 *
 * Requires on the DB side:
 *   - `compliments`, `group_completions`, `team_completions` in
 *     the `supabase_realtime` publication
 *     (see migrations/20260501_realtime_publication.sql).
 */
export function useReceivedComplimentsRealtime(
  username: string | null | undefined,
  onChange: () => void,
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!username) return;

    // Compliments are matched to a recipient by id OR username OR email OR
    // phone (see load_received_compliments / the contact-matching design).
    // Matching the event on recipient_name alone missed every compliment
    // delivered via the other three paths — no live refresh, no unread dot.
    // Resolve the caller's full identity once per subscription; events that
    // arrive before it loads can only fall back to the name match.
    const me = { userId: null as string | null, email: null as string | null, phone: null as string | null };
    void (async () => {
      const { data } = await supabase.auth.getSession();
      me.userId = data.session?.user.id ?? null;
      if (!me.userId) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('email, phone')
        .eq('id', me.userId)
        .maybeSingle();
      me.email = norm(prof?.email) || null;
      me.phone = digits(prof?.phone) || null;
    })();

    const matchesMe = (row: any): boolean => {
      if (me.userId && row?.recipient_id === me.userId) return true;
      const name = norm(row?.recipient_name);
      if (name && name === norm(username)) return true;
      const email = norm(row?.recipient_email);
      if (me.email && email && email === me.email) return true;
      const phone = digits(row?.recipient_phone);
      if (
        me.phone && phone &&
        (phone === me.phone ||
          (phone.length >= 10 && me.phone.length >= 10 && phone.slice(-10) === me.phone.slice(-10)))
      ) return true;
      return false;
    };

    const handle = (payload: any) => {
      const newRow = payload?.new ?? {};
      if (__DEV__) {
        console.log('[received-rt] event', payload?.eventType, 'table=', payload?.table, 'recipient_name=', newRow?.recipient_name);
      }
      if (matchesMe(newRow)) {
        if (__DEV__) console.log('[received-rt] match — refetching received');
        onChangeRef.current();
      }
    };

    const channel = supabase
      .channel(`received-compliments:${username}:${nextChannelId()}`)
      .on(
        'postgres_changes',
        // Real personal-compliments table is `compliments` on this DB.
        // The previous `completions` reference was a stale name from
        // an earlier schema version and made this hook silently no-op.
        { event: 'INSERT', schema: 'public', table: 'compliments' },
        handle,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_completions' },
        handle,
      )
      .on(
        // team_completions: listen to INSERT (initial submission) AND UPDATE
        // (moderation approval). Approved-only rows appear in Recap, so an
        // UPDATE that flips status to 'approved' is also newly visible.
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_completions' },
        handle,
      )
      .subscribe((status, err) => {
        // Surface subscription lifecycle so silent failures (CHANNEL_ERROR,
        // TIMED_OUT, CLOSED) are visible in the RN log. If you see anything
        // other than SUBSCRIBED, realtime events will NOT arrive — usually
        // a RLS policy, missing publication, or auth token issue.
        if (__DEV__) {
          console.log('[received-rt] status=', status, err ? `err=${err.message}` : '');
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [username]);
}

/**
 * Subscribes to INSERTs on `compliments` filtered by sender_id, so the
 * Recap "Sent" tab updates the moment a daily-challenge submit
 * round-trips through complete_daily_prompt. Mirrors the web hook.
 */
export function useSentComplimentsRealtime(
  userId: string | null | undefined,
  onChange: () => void,
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`sent-compliments:${userId}:${nextChannelId()}`)
      .on(
        'postgres_changes',
        {
          // '*', not INSERT-only: the recipient reading a compliment flips
          // is_read via an UPDATE, which is what live-updates the sender's
          // Read/Delivered receipt on the Recap "Sent" tab.
          event: '*',
          schema: 'public',
          table: 'compliments',
          filter: `sender_id=eq.${userId}`,
        },
        () => onChangeRef.current(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}

/**
 * Subscribes to the current user's membership across ALL groups + teams.
 * Use on list screens (GroupsScreen, TeamsListScreen) so when the user is
 * added to / removed from any group/team, the list refreshes immediately.
 *
 * Filter is by user_id, so each client only receives events for their own
 * membership rows — efficient.
 */
export function useMyMembershipRealtime(
  userId: string | null | undefined,
  onChange: () => void,
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`my-membership:${userId}:${nextChannelId()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${userId}` },
        () => onChangeRef.current(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members', filter: `user_id=eq.${userId}` },
        () => onChangeRef.current(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}

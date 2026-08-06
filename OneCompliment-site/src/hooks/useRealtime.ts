import { useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// Monotonic id so every hook invocation gets a unique channel name.
// Without this, two screens subscribing to the same logical channel
// (e.g. Groups + Teams both calling useMyMembershipRealtime with the
// same userId) would collide on the channel name and supabase-js would
// throw "cannot add `postgres_changes` callbacks ... after `subscribe()`".
let channelSeq = 0
const nextChannelId = () => `${Date.now().toString(36)}-${(++channelSeq).toString(36)}`

const DEV = import.meta.env.DEV

type Row = Record<string, unknown>
type Payload = RealtimePostgresChangesPayload<Row>

// Strip a leading '@' so a legacy "@handle" recipient_name still matches the
// bare stored username. Safe for the email/phone callers below — emails never
// carry a leading '@' for this to remove.
const norm = (s?: unknown) => (s ?? '').toString().trim().toLowerCase().replace(/^@+/, '')
const digits = (s?: unknown) => (s ?? '').toString().replace(/\D/g, '')

/**
 * Subscribes to realtime changes on a group's membership, feed, and reactions.
 * onChange() runs on any update affecting the group's displayed state.
 * onRemoved() runs if the CURRENT user's membership row is deleted.
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
  const onChangeRef = useRef(onChange)
  const onRemovedRef = useRef(onRemoved)
  onChangeRef.current = onChange
  onRemovedRef.current = onRemoved

  useEffect(() => {
    if (!groupId || !userId) return

    const channel = supabase
      .channel(`group-rt:${groupId}:${nextChannelId()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        (payload: Payload) => {
          const oldRow = payload.old as { user_id?: string } | null
          if (payload.eventType === 'DELETE' && oldRow?.user_id === userId) {
            onRemovedRef.current()
            return
          }
          onChangeRef.current()
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, userId])
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
  const onChangeRef = useRef(onChange)
  const onRemovedRef = useRef(onRemoved)
  onChangeRef.current = onChange
  onRemovedRef.current = onRemoved

  useEffect(() => {
    if (!teamId || !userId) return

    const channel = supabase
      .channel(`team-rt:${teamId}:${nextChannelId()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` },
        (payload: Payload) => {
          const oldRow = payload.old as { user_id?: string } | null
          if (payload.eventType === 'DELETE' && oldRow?.user_id === userId) {
            onRemovedRef.current()
            return
          }
          onChangeRef.current()
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, userId])
}

/**
 * Subscribes to INSERTs on the three compliment tables (personal, group,
 * team) so a "Compliments Received" list updates live when anyone sends a
 * compliment addressed to the current user.
 *
 * Unfiltered subscription: recipient_name is free-form text stored as
 * whatever the sender typed, and the recipient match is case-insensitive.
 * A server-side filter would need exact case. The onChange handler re-runs
 * the RPC which applies the proper LOWER() match; low-volume events are
 * cheap to debounce on the client.
 */
export function useReceivedComplimentsRealtime(
  username: string | null | undefined,
  onChange: () => void,
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!username) return

    // Compliments are matched to a recipient by id OR username OR email OR
    // phone (see load_received_compliments / the contact-matching design).
    // Matching the event on recipient_name alone missed every compliment
    // delivered via the other three paths — no live refresh, no unread dot.
    // Resolve the caller's full identity once per subscription; events that
    // arrive before it loads can only fall back to the name match.
    const me = { userId: null as string | null, email: null as string | null, phone: null as string | null }
    void (async () => {
      const { data } = await supabase.auth.getSession()
      me.userId = data.session?.user.id ?? null
      if (!me.userId) return
      const { data: prof } = await supabase
        .from('profiles')
        .select('email, phone')
        .eq('id', me.userId)
        .maybeSingle()
      me.email = norm((prof as { email?: string } | null)?.email) || null
      me.phone = digits((prof as { phone?: string } | null)?.phone) || null
    })()

    const matchesMe = (row: {
      recipient_id?: string
      recipient_name?: string
      recipient_email?: string
      recipient_phone?: string
    }): boolean => {
      if (me.userId && row.recipient_id === me.userId) return true
      const name = norm(row.recipient_name)
      if (name && name === norm(username)) return true
      const email = norm(row.recipient_email)
      if (me.email && email && email === me.email) return true
      const phone = digits(row.recipient_phone)
      if (
        me.phone &&
        phone &&
        (phone === me.phone ||
          (phone.length >= 10 && me.phone.length >= 10 && phone.slice(-10) === me.phone.slice(-10)))
      ) {
        return true
      }
      return false
    }

    const handle = (payload: Payload) => {
      const newRow = (payload.new ?? {}) as Record<string, string | undefined>
      if (DEV) {
        console.log(
          '[received-rt] event',
          payload.eventType,
          'table=',
          payload.table,
          'recipient_name=',
          newRow?.recipient_name,
        )
      }
      if (matchesMe(newRow)) {
        onChangeRef.current()
      }
    }

    const channel = supabase
      .channel(`received-compliments:${username}:${nextChannelId()}`)
      .on(
        'postgres_changes',
        // Real personal-compliments table is `compliments` (not the
        // assumed `completions`).
        { event: 'INSERT', schema: 'public', table: 'compliments' },
        handle,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_completions' },
        handle,
      )
      .on(
        // team_completions: listen to INSERT + UPDATE — moderation approval
        // (status 'pending' → 'approved') is the moment a recipient first
        // sees the compliment, so it's newly visible to them at UPDATE time.
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_completions' },
        handle,
      )
      .subscribe((status, err) => {
        if (DEV) {
          console.log(
            '[received-rt] status=',
            status,
            err ? `err=${err.message}` : '',
          )
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [username])
}

/**
 * Subscribes to INSERTs on `completions` filtered by user_id, so the
 * History page's "Sent" tab updates the moment the daily-challenge submit
 * round-trips through complete_daily_prompt.
 */
export function useSentComplimentsRealtime(
  userId: string | null | undefined,
  onChange: () => void,
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`sent-compliments:${userId}:${nextChannelId()}`)
      .on(
        'postgres_changes',
        {
          // '*', not INSERT-only: the recipient reading a compliment flips
          // is_read via an UPDATE, which is what live-updates the sender's
          // Read/Delivered receipt on the Sent tab.
          event: '*',
          schema: 'public',
          // Real table is `compliments` (probed 2026-04-30) — `completions`
          // was the assumed name, never existed in this project.
          table: 'compliments',
          filter: `sender_id=eq.${userId}`,
        },
        () => onChangeRef.current(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
}

/**
 * Subscribes to the current user's membership across ALL groups + teams.
 * Use on list screens so when the user is added to / removed from any
 * group/team, the list refreshes immediately. Filter is by user_id, so
 * each client only receives events for their own membership rows.
 */
export function useMyMembershipRealtime(
  userId: string | null | undefined,
  onChange: () => void,
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!userId) return

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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
}

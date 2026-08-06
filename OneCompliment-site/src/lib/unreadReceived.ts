// Shared "unread received compliments" count.
//
// The web app has no global store and each route renders its own BottomNav,
// so the unread red dot (shown in BottomNav) and the mark-as-read action
// (fired on the History page) live in different component trees. This tiny
// module-level store bridges them: any component can read the count via the
// useUnreadReceived() hook, and a mark-read on History propagates the cleared
// count to every mounted BottomNav. Mirrors mobile's Redux `unreadReceived`.

import type { RealtimeChannel } from '@supabase/supabase-js'
import { loadUnreadReceivedCount, markReceivedRead, supabase } from './supabase'

let count = 0
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

// ── Realtime: light the dot the moment a compliment arrives ──────
// The focus/visibility refresh in useUnreadReceived only fires when the
// user comes BACK to the tab; while they sit on Home, an arriving
// compliment left the dot dark until the next navigation. One shared
// channel (alive while any BottomNav is mounted) refreshes the count on
// any compliment-table insert; the count RPC does the authoritative
// recipient matching, so a non-matching event just costs one cheap call.
// Debounced so an approval burst refreshes once.
let channel: RealtimeChannel | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    void refreshUnread()
  }, 500)
}

function ensureRealtime() {
  if (channel || listeners.size === 0) return
  channel = supabase
    .channel('unread-received-rt')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'compliments' }, scheduleRefresh)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_completions' }, scheduleRefresh)
    // team_completions UPDATE too — moderation approval is when the
    // compliment first becomes visible to the recipient.
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_completions' }, scheduleRefresh)
    .subscribe()
}

function teardownRealtime() {
  if (channel && listeners.size === 0) {
    void supabase.removeChannel(channel)
    channel = null
  }
}

export function subscribeUnread(cb: () => void): () => void {
  listeners.add(cb)
  ensureRealtime()
  return () => {
    listeners.delete(cb)
    teardownRealtime()
  }
}

export function getUnreadSnapshot(): number {
  return count
}

function setCount(n: number) {
  const next = Math.max(0, n)
  if (next !== count) {
    count = next
    emit()
  }
}

/** Re-pull the unread count from the server and broadcast it. */
export async function refreshUnread(): Promise<void> {
  setCount(await loadUnreadReceivedCount())
}

/** Clear the dot immediately (optimistic) and flip the rows read server-side. */
export async function clearUnread(): Promise<void> {
  setCount(0)
  await markReceivedRead()
}

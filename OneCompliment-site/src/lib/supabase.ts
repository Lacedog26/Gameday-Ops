import { createClient, type Session } from '@supabase/supabase-js'
import { deviceTimeZone, todayLocal, localDayOf } from './dates'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ── Session ───────────────────────────────────────────────────
export async function ensureSession(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    // Heal a previously failed anon→email merge (see retryPendingMerge).
    // Fire-and-forget: never blocks bootstrap.
    void retryPendingMerge()
    return data.session.user.id
  }
  const { data: signed, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('Anonymous sign-in failed:', error)
    return null
  }
  return signed.session?.user.id ?? null
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** Push the browser's IANA timezone to the profile so the server keys streak
 *  rollover + the daily prompt off the user's local day (profile_local_date).
 *  Best-effort — never throws, never blocks. Mirrors mobile's syncTimezone. */
export async function syncTimezone(): Promise<void> {
  const tz = deviceTimeZone()
  if (!tz) return
  try {
    await supabase.rpc('set_my_timezone', { p_timezone: tz })
  } catch {
    /* best effort — an unknown/blocked tz just leaves the server default */
  }
}

// ── Received / unread status ──────────────────────────────────
/** Count of received compliments the signed-in user hasn't seen yet. Drives
 *  the Recap-tab red dot. Mirrors mobile. Returns 0 on any error. */
export async function loadUnreadReceivedCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_received_count')
  if (error) {
    console.warn('[unread] count error:', error.message)
    return 0
  }
  return (data as number) ?? 0
}

/** Mark all of the caller's received compliments read (called when they open
 *  the Recap/History page). Returns the number flipped; 0 on error. */
export async function markReceivedRead(): Promise<number> {
  const { data, error } = await supabase.rpc('mark_received_read')
  if (error) {
    console.warn('[unread] mark-read error:', error.message)
    return 0
  }
  return (data as number) ?? 0
}

// ── Feedback ──────────────────────────────────────────────────
/** Insert a feedback row into app_feedback — the same table the mobile
 *  Settings form writes to. Returns false when nothing was stored (no
 *  session or insert error) so the UI never claims "Thank you!" over a
 *  feedback that went nowhere. */
export async function submitFeedback(rating: number, comment: string): Promise<boolean> {
  const userId = await ensureSession()
  if (!userId) return false
  const profile = await loadProfile()
  const { error } = await supabase.from('app_feedback').insert({
    user_id: userId,
    username: profile.username ?? null,
    rating: rating > 0 ? rating : null,
    comment: comment.trim() || null,
  })
  if (error) {
    console.warn('[feedback] insert error:', error.message)
    return false
  }
  return true
}

// ── Profile (username / email) ────────────────────────────────
export type Profile = { username: string | null; email: string | null }

export async function loadProfile(): Promise<Profile> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return { username: null, email: null }
  const { data } = await supabase
    .from('profiles')
    .select('username, email')
    .eq('id', userId)
    .maybeSingle()
  return { username: data?.username ?? null, email: data?.email ?? null }
}

/**
 * Reads `profiles.is_pro` if the column exists. Returns `false` cleanly
 * for missing column / no profile / no session — never throws.
 *
 * Mobile entitlement currently lives in RevenueCat client-side (see
 * OneComplimentApp/src/utils/revenuecat.ts). Web is planned to read a
 * server-mirrored flag once a Stripe / RC webhook flips it; this helper
 * is forward-compatible with that pipeline.
 */
export async function loadProStatus(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return false
  const { data, error } = await supabase
    .from('profiles')
    .select('is_pro')
    .eq('id', userId)
    .maybeSingle()
  if (error) return false
  return Boolean((data as { is_pro?: boolean } | null)?.is_pro)
}

/**
 * Returns true if any profile row already has this email. Used by the
 * setup modal to skip the username step when a returning user types their
 * existing email — they just OTP in and their old data loads automatically.
 */
export async function emailExists(email: string): Promise<boolean> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed.includes('@') || !trimmed.includes('.')) return false
  const { data, error } = await supabase.rpc('email_exists', { p_email: trimmed })
  if (error) {
    console.warn('[email_exists] error:', error.message)
    return false
  }
  return Boolean(data)
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const userId = await ensureSession()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (error) return true // RLS may block reads — let upsert catch real dupes
  return data === null || data.id === userId
}

export async function claimUsername(
  username: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const userId = await ensureSession()
  if (!userId) return { ok: false, error: 'Could not connect. Please check your internet connection.' }

  const { error } = await supabase.rpc('upsert_profile', {
    p_user_id: userId,
    p_username: username,
  })
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Username already taken' }
    return { ok: false, error: error.message }
  }
  return { ok: true, userId }
}

// ── Daily challenge / streak ──────────────────────────────────
export async function loadDailyPrompt(): Promise<{ id: string; prompt_text: string } | null> {
  const today = todayLocal()
  const { data, error } = await supabase.rpc('get_daily_prompt', { p_for_date: today })
  if (error) {
    console.error('Prompt load error:', error)
    return null
  }
  // RETURNS daily_prompts (a row). Defensively handle: row | row[] | null.
  const row = (Array.isArray(data) ? data[0] : data) as
    | { id?: string | number; prompt_text?: string | null; prompt?: string | null }
    | null
    | undefined
  if (!row) return null
  // Accept either column name; reject empty/null so the caller can keep
  // using the local CHALLENGES rotation as a fallback (better UX than
  // rendering "Today: null" in the share card).
  const text = (row.prompt_text ?? row.prompt ?? '').toString().trim()
  // Reject the literal string "null" / "undefined" (case-insensitive) — the
  // RPC sometimes returns these when the source row's column is unset, and
  // they would render as `Today: null` in the share card.
  if (!text || /^(null|undefined)$/i.test(text)) return null
  return { id: String(row.id ?? ''), prompt_text: text }
}

export type MyStreak = {
  /** Raw stored counter. Only recomputed when the user next completes a
   *  prompt, so it LAGS on a missed day (shows the old value until then).
   *  Kept for the freeze bridge + the "your N-day streak is at risk" copy;
   *  prefer `effective_streak` for display. */
  current_streak: number
  longest_streak: number
  /** Freeze-aware honest streak: drops to 0 once a day has been missed and
   *  the gap isn't covered by a Pro freeze (server effective_current_streak).
   *  Falls back to current_streak when the RPC isn't deployed yet. */
  effective_streak: number
  /** ISO date (YYYY-MM-DD) of the user's most recent completion, or null.
   *  Backed by `user_streaks.last_completed_on` — confirmed via probe
   *  on 2026-04-30. (Earlier code referenced `last_completed`, which
   *  was a pre-rename column name.) */
  last_completed: string | null
}

export async function loadMyStreak(): Promise<MyStreak | null> {
  // Same getSession-vs-getUser caveat as loadComplimentHistory.
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return null
  // Read the raw row (unchanged — Home relies on its exact behaviour) and
  // the freeze-aware effective value in parallel.
  const [streakRes, effRes] = await Promise.all([
    supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, last_completed_on')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.rpc('effective_current_streak', { p_user_id: userId }),
  ])
  if (streakRes.error) {
    console.warn('Load streak error:', streakRes.error.message)
    return null
  }
  const data = streakRes.data
  if (!data) return null
  const current = (data as { current_streak?: number }).current_streak ?? 0
  // effRes.data is the scalar int; null/error means the RPC isn't deployed
  // (pre-migration) or we're offline — fall back to the raw count so the
  // page still renders.
  const effective =
    !effRes.error && typeof effRes.data === 'number' ? effRes.data : current
  return {
    current_streak: current,
    longest_streak: (data as { longest_streak?: number }).longest_streak ?? 0,
    effective_streak: effective,
    last_completed:
      (data as { last_completed_on?: string | null }).last_completed_on ?? null,
  }
}

export async function submitCompliment(opts: {
  body: string
  promptId: string | null
  recipientName: string
  /** When the user picked a registered recipient from the search dropdown.
   *  Server populates recipient_id from this directly; otherwise it falls
   *  back to a username lookup on recipient_name and may still set it. */
  recipientId?: string | null
}): Promise<{ completionId: string | null; error: { message: string } | null }> {
  // Match mobile's submitCompliment shape: same 4 args, same null defaults.
  const payload = {
    p_body: opts.body,
    p_prompt_id: opts.promptId,
    p_recipient_id: opts.recipientId ?? null,
    p_recipient_name: opts.recipientName,
  }
  console.log('[submitCompliment] calling complete_daily_prompt', payload)
  const { data, error } = await supabase.rpc('complete_daily_prompt', payload)
  if (error) {
    console.error('[submitCompliment] error:', error)
    return { completionId: null, error }
  }
  console.log('[submitCompliment] success:', data)
  // The RPC may return either `{ completion_id }` (the freeze-aware version
  // I migrated) or a row from `completions` (the live mobile-supporting
  // version). Read whichever comes back.
  const row = data as { completion_id?: string; id?: string } | null
  const completionId = row?.completion_id ?? row?.id ?? null
  triggerLocationUpdate()
  if (completionId) triggerComplimentPush(completionId, 'personal')
  return { completionId, error: null }
}

/**
 * Fire-and-forget IP→geo lookup that updates profiles.location_* for the
 * caller. Called after every successful compliment post (personal, team,
 * group). Failure is silent — never blocks the post.
 *
 * Capture is gated server-side on profiles.location_share (opt-in, off by
 * default per the 2026-05-18 privacy hardening): the function returns early
 * without any IP→geo lookup unless the user turned on Local Leaderboard in
 * Settings. So this is a no-op for users who haven't opted in — they must
 * flip the toggle first, then their next post captures their area.
 */
export function triggerLocationUpdate(): void {
  void supabase.functions.invoke('update-my-location').catch((e) => {
    if (import.meta.env.DEV) console.warn('[geo] update-my-location failed:', e?.message ?? e)
  })
}

/**
 * Fire-and-forget — invoke the send-compliment-push Edge Function after a
 * successful compliment submit. The Edge Function verifies the caller is
 * the sender, honors the recipient's notify_on_received opt-in, and skips
 * team posts that are still pending moderation. Never blocks the submit.
 *
 * Mirrors mobile's utils/notifications.ts:triggerComplimentPush — kept here
 * so the web's submit / group-post / team-submit paths all push without
 * each caller having to remember the fire-and-forget invoke shape.
 */
export function triggerComplimentPush(
  completionId: string,
  source: 'personal' | 'team' | 'group',
): void {
  if (!completionId) return
  void supabase.functions
    .invoke('send-compliment-push', { body: { completionId, source } })
    .catch((e) => {
      if (import.meta.env.DEV) console.warn('[push] send-compliment-push failed:', e?.message ?? e)
    })
}

// ── Geo leaderboard ─────────────────────────────────────────────
export type GeoLeaderboardScope = 'city' | 'region' | 'country'

export interface GeoLeaderboardRow {
  rank: number
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  location_city: string | null
  location_region: string | null
  location_country: string | null
  current_streak: number
  longest_streak: number
  bloomed_today: boolean
  is_me: boolean
}

export interface GeoLeaderboardSummary {
  has_location: boolean
  share: boolean
  city?: string
  region?: string
  country?: string
  country_code?: string
  city_count?: number
  region_count?: number
  country_count?: number
}

export async function loadGeoLeaderboard(
  scope: GeoLeaderboardScope = 'city',
  limit = 25,
): Promise<GeoLeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_geo_leaderboard', { p_scope: scope, p_limit: limit })
  if (error) {
    console.warn('[geo] leaderboard error:', error.message)
    return []
  }
  return (data ?? []) as GeoLeaderboardRow[]
}

export async function loadGeoLeaderboardSummary(): Promise<GeoLeaderboardSummary> {
  const { data, error } = await supabase.rpc('get_geo_leaderboard_summary')
  if (error || !data) return { has_location: false, share: false }
  return data as GeoLeaderboardSummary
}

export async function setMyLocationShare(share: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_my_location_share', { p_share: share })
  if (error) {
    console.warn('[geo] set share error:', error.message)
    return false
  }
  return data === share
}

/**
 * Returns the user's most recent compliment created today, or null.
 * Used by Home to render the celebratory Done screen when the user
 * comes back to the Home tab on the same day they already submitted —
 * matches mobile's "if lastChallengeDate === today, push Done" UX.
 *
 * Note: column names follow the live `compliments` table (not the
 * older `completions`) — confirmed via probe on 2026-04-30.
 */
export async function loadTodayCompletion(): Promise<{
  id: string
  body: string
  recipientName: string
  recipientId: string | null
} | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return null

  // Match against the start of today in UTC. The clock comparison
  // tolerance is fine here — ±1 day on a tab left open across midnight
  // is harmless (worst case the user sees Landing again briefly).
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  const cutoffIso = cutoff.toISOString()

  const { data, error } = await supabase
    .from('compliments')
    .select('id, body, recipient_name, recipient_id, created_at')
    .eq('sender_id', userId)
    .gte('created_at', cutoffIso)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.warn('[loadTodayCompletion] error:', error.message)
    return null
  }
  const row = (data as Array<Record<string, unknown>> | null)?.[0]
  if (!row) return null
  return {
    id: row.id as string,
    body: (row.body as string) ?? '',
    recipientName: (row.recipient_name as string) ?? '',
    recipientId: (row.recipient_id as string | null) ?? null,
  }
}

// ── Public compliment view (share link for unregistered recipients) ──
export type PublicCompliment = {
  id: string
  body: string
  recipient_name: string
  sender_username: string | null
  sender_display: string | null
  created_at: string
}

export async function loadPublicCompliment(id: string): Promise<PublicCompliment | null> {
  const { data, error } = await supabase.rpc('get_public_compliment', { p_id: id })
  if (error) {
    console.warn('Public compliment load error:', error.message)
    return null
  }
  return (data as PublicCompliment | null) ?? null
}

/**
 * Sanity check after submit — verifies a fresh row landed in the
 * `compliments` table for this sender in the last 60 seconds.
 */
export async function verifyRecentCompletion(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return false
  const cutoff = new Date(Date.now() - 60_000).toISOString()
  const { data, error } = await supabase
    .from('compliments')
    .select('id, created_at')
    .eq('sender_id', userId)
    .gte('created_at', cutoff)
    .limit(1)
  if (error) {
    console.warn('[verifyRecentCompletion] read error:', error.message)
    return false
  }
  console.log('[verifyRecentCompletion] last-60s rows:', data?.length ?? 0)
  return Boolean(data && data.length > 0)
}

// ── Recipient search (Write screen) ───────────────────────────
export type UserSearchResult = {
  user_id: string
  username: string
  display_name: string
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  // Usernames are stored without a leading '@', but the Write box invites
  // "@handle" input. Strip a leading '@' so typing "@test" still matches the
  // stored username "test" — otherwise the dropdown comes up empty and the
  // sender falls through to the free-text path (no recipient_id is set).
  const q = query.trim().replace(/^@+/, '')
  if (q.length < 2) return []
  const { data, error } = await supabase.rpc('search_users', {
    p_query: q,
    p_limit: 10,
  })
  if (error) {
    console.warn('Search users error:', error.message)
    return []
  }
  return (data as UserSearchResult[]) ?? []
}

// ── Streak freeze (Pro) ───────────────────────────────────────
export type StreakFreezeStatus = {
  available: boolean
  used_today: boolean
  last_used: string | null
  next_available: string | null
}

export async function getStreakFreezeStatus(): Promise<StreakFreezeStatus | null> {
  const { data, error } = await supabase.rpc('get_streak_freeze_status')
  if (error) {
    // The RPC may not exist if the migration hasn't been applied yet.
    // Treat as "freezes unavailable" rather than throwing.
    console.warn('Freeze status error:', error.message)
    return null
  }
  return data as StreakFreezeStatus
}

export async function useStreakFreeze(): Promise<
  | { ok: true; freezeDate: string }
  | { ok: false; error: 'pro_required' | 'weekly_limit' | 'future_date' | string; nextAvailable?: string }
> {
  const { data, error } = await supabase.rpc('use_streak_freeze')
  if (error) return { ok: false, error: error.message }
  const result = data as
    | { ok?: true; freeze_date?: string; error?: string; next_available?: string }
    | null
  if (result?.error) {
    return { ok: false, error: result.error, nextAvailable: result.next_available }
  }
  return { ok: true, freezeDate: result?.freeze_date ?? '' }
}

// ── Compliment history ────────────────────────────────────────
export type SentCompliment = {
  id: string
  date: string
  recipient: string
  body: string
  createdAt: string
  /** Resolved recipient account, when the compliment matched one. */
  recipientId: string | null
  /** Read receipt: true once the recipient viewed it (Recap open or a
   *  direct compliment view). Drives Read/Delivered/Sent on the Sent tab. */
  isRead: boolean
}

export type ReceivedCompliment = {
  id: string
  body: string
  senderUsername: string
  /** 'personal' | 'group' | 'team' — where the compliment came from. */
  source: 'personal' | 'group' | 'team'
  /** Group/team name if source !== 'personal'. */
  contextName: string | null
  createdAt: string
  date: string
}

export async function loadComplimentHistory(limit = 365): Promise<SentCompliment[]> {
  // Use the SECURITY DEFINER RPC so reads succeed regardless of RLS
  // policy state (the migration also adds a sender SELECT policy as
  // belt-and-suspenders, but RPCs decouple us from policy drift).
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    console.warn('Load history: no session — user not authenticated yet')
    return []
  }
  const { data, error } = await supabase.rpc('load_my_compliment_history', {
    p_limit: limit,
  })
  if (error) {
    console.warn('Load history error:', error.message, error)
    return []
  }
  const rows = (data as Array<Record<string, unknown>> | null) ?? []
  console.log('[loadComplimentHistory] rows:', rows.length)
  const mapped = rows.map((row) => ({
    id: row.id as string,
    // Local calendar day, NOT created_at.slice(0,10) (= UTC day): the
    // one-per-day dedup below hid a legitimate evening compliment for
    // users west of UTC, and "Today" labels were off by one.
    date: localDayOf(row.created_at as string),
    recipient: (row.recipient_name as string) ?? '',
    body: (row.body as string) ?? '',
    createdAt: (row.created_at as string) ?? '',
    recipientId: (row.recipient_id as string | null) ?? null,
    isRead: Boolean(row.is_read),
  }))

  // Defensive dedup by date — the rule is one compliment per user per
  // local day, and the new server-side trigger enforces it, but any
  // duplicates created before the migration was applied still show up
  // here. Keep the most recent per date so the Recap shows a single
  // entry per day even on legacy data.
  const seenDate = new Set<string>()
  return mapped.filter((c) => {
    if (!c.date) return true // missing date — keep, defer to id dedup elsewhere
    if (seenDate.has(c.date)) return false
    seenDate.add(c.date)
    return true
  })
}

/**
 * Returns compliments addressed to the current user across personal,
 * group, and team feeds — most recent first.
 *
 * Goes through the `load_received_compliments` RPC (rebuilt 20260613,
 * extended 20260617): it matches by recipient_id, username, email AND
 * phone — more rows than the direct table selects this used to run —
 * and it enforces the Pro history window server-side (7 days free /
 * 365 Pro), so the gated archive is no longer shipped to free browsers
 * just to be hidden in render. (The old "RPC hits the wrong schema"
 * caveat predates the 20260613 rebuild and no longer applies.)
 */
export async function loadReceivedCompliments(limit = 365): Promise<ReceivedCompliment[]> {
  const { data, error } = await supabase.rpc('load_received_compliments', { p_limit: limit })
  if (error) {
    console.warn('[loadReceived] rpc error:', error.message)
    return []
  }

  type RpcRow = {
    id: string
    body: string | null
    sender_username: string | null
    source: 'personal' | 'group' | 'team'
    context_name: string | null
    created_at: string | null
  }
  const rows = ((data as RpcRow[] | null) ?? []).map((r) => ({
    id: r.id,
    body: r.body ?? '',
    senderUsername: r.sender_username ?? 'Someone',
    source: r.source ?? 'personal',
    contextName: r.context_name,
    createdAt: r.created_at ?? '',
    date: localDayOf(r.created_at),
  }))

  // Logical-equivalence dedup: same sender + same exact body + same day
  // = same compliment (a cross-write shows up in `compliments` AND
  // `group_completions` under different ids). Prefer the entry with
  // richer context (group/team over plain personal) so the "from
  // @Someone · group · Test" version wins over the bare "from @Someone".
  const sourceRank = { personal: 0, group: 1, team: 1 } as const
  const byKey = new Map<string, ReceivedCompliment>()
  for (const c of rows) {
    const key = `${c.senderUsername}|${(c.body ?? '').trim()}|${c.date}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, c)
      continue
    }
    const pickNew =
      sourceRank[c.source] > sourceRank[existing.source] ||
      (sourceRank[c.source] === sourceRank[existing.source] &&
        c.createdAt > existing.createdAt)
    if (pickNew) byKey.set(key, c)
  }

  return Array.from(byKey.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** Flip one compliment read when the recipient views it directly
 *  (the /c/:id page). Best-effort: anonymous visitors or non-recipients
 *  simply don't match the RPC's identity predicate and nothing flips. */
export async function markComplimentRead(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_compliment_read', { p_id: id })
  if (error) console.warn('[read-receipt] mark error:', error.message)
}

// ── History gate (Pro) ────────────────────────────────────────
// The server withholds entries beyond the free 7-day window, so a free
// client can't count "hidden" rows by diffing fetch vs render — this
// RPC reports the counts so the History ProGate stays accurate.
export type HistoryGateInfo = {
  is_pro: boolean
  hidden_sent: number
  hidden_received: number
}

export async function getHistoryGateInfo(): Promise<HistoryGateInfo | null> {
  const { data, error } = await supabase.rpc('get_history_gate_info')
  if (error) {
    console.warn('[historyGate] rpc error:', error.message)
    return null
  }
  return data as HistoryGateInfo
}

// ── Email linking via OTP (kept simple for now; UI deferred) ──
export async function sendEmailOtp(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<
  | { ok: true; userId: string | null; merged: boolean; mergeError?: string }
  | { ok: false; error: string }
> {
  const { data: sessionData } = await supabase.auth.getSession()
  const anonUser = sessionData.session?.user ?? null
  const anonUserId = anonUser?.id ?? null
  const wasAnonymous = anonUser?.is_anonymous ?? false

  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) return { ok: false, error: error.message }

  const emailUserId = data.session?.user.id ?? null
  if (!emailUserId || !anonUserId || emailUserId === anonUserId) {
    return { ok: true, userId: emailUserId, merged: false }
  }

  // The verifyOtp above already replaced the anon session, so a failed
  // merge here orphans the anon account's streak/username/groups. rpc()
  // reports failures via { error } (it does NOT throw), and the RPC itself
  // RAISEs on every refusal path — so this must be inspected, not caught.
  const { data: mergeData, error: mergeError } = await supabase.rpc(
    'merge_anonymous_to_email_user',
    {
      p_anon_user_id: anonUserId,
      p_email: email,
    },
  )
  if (mergeError) {
    console.error('[merge] anon→email merge failed:', mergeError.message)
    // The RPC runs as the (now signed-in) email user and only needs the
    // anon id + email, so it stays retryable — queue it for the next
    // bootstrap. Only worth queueing when the source really was an anon
    // account; the RPC permanently refuses non-anonymous sources.
    if (wasAnonymous) {
      savePendingMerge({
        anonUserId,
        email,
        emailUserId,
        failedAt: new Date().toISOString(),
      })
    }
    return { ok: true, userId: emailUserId, merged: false, mergeError: mergeError.message }
  }

  clearPendingMerge()
  const merged = (mergeData as { merged?: boolean } | null)?.merged ?? false
  return { ok: true, userId: emailUserId, merged }
}

// ── Pending anon→email merge retry ────────────────────────────
// When the merge RPC fails AFTER verifyOtp has already swapped the
// session, the anon account's data is orphaned unless we remember to
// retry. The record lives in localStorage and is retried on every
// session bootstrap until it succeeds or becomes permanently
// unmergeable.
const PENDING_MERGE_KEY = 'oc_pending_merge_v1'

type PendingMerge = {
  anonUserId: string
  email: string
  /** Only retry while THIS account is signed in — merging the orphaned
   *  anon data into any other account would misattribute it. */
  emailUserId: string
  failedAt: string
}

function savePendingMerge(p: PendingMerge): void {
  try {
    localStorage.setItem(PENDING_MERGE_KEY, JSON.stringify(p))
  } catch {
    /* storage full/blocked — nothing else we can do */
  }
}

function loadPendingMerge(): PendingMerge | null {
  try {
    const raw = localStorage.getItem(PENDING_MERGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as PendingMerge
    if (!p.anonUserId || !p.email || !p.emailUserId) return null
    return p
  } catch {
    return null
  }
}

function clearPendingMerge(): void {
  try {
    localStorage.removeItem(PENDING_MERGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Re-attempt a previously failed anon→email merge. Fire-and-forget from
 *  ensureSession — never throws, no-ops when there's nothing pending or
 *  the signed-in user isn't the one the merge belongs to. */
export async function retryPendingMerge(): Promise<void> {
  const pending = loadPendingMerge()
  if (!pending) return
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user || user.id !== pending.emailUserId) return

  const { error } = await supabase.rpc('merge_anonymous_to_email_user', {
    p_anon_user_id: pending.anonUserId,
    p_email: pending.email,
  })
  if (!error) {
    clearPendingMerge()
    console.log('[merge] pending anon→email merge recovered')
    return
  }
  // "Refusing to merge a non-anonymous account" also fires when the anon
  // auth user no longer exists (already merged/deleted) — either way no
  // retry can ever succeed, so drop the record instead of looping forever.
  if (error.message.includes('non-anonymous')) {
    clearPendingMerge()
    console.warn('[merge] pending merge dropped (source no longer mergeable):', error.message)
  } else {
    console.warn('[merge] pending merge retry failed, will retry next bootstrap:', error.message)
  }
}

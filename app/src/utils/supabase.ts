import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { todayLocal, deviceTimeZone, localDayOf } from './dates';

// Boot-safety: if these env vars aren't inlined into the bundle (the
// most common cause is an EAS build without the .env values — `.env`
// is gitignored so EAS Build skips it), fall back to placeholder values
// so createClient doesn't throw synchronously during module evaluation
// and brick the entire app at the splash screen. Backend calls will
// fail with a network error and surface via the existing try/catches
// in App.tsx, but the UI still loads.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set in this build. ' +
    'For EAS production/preview builds add them to eas.json env block or run `eas env:create`. ' +
    'App will boot but every backend call will fail.'
  );
}

// Mutable ref so the fetch wrapper (defined before createClient runs) can
// still reach the client after initialization. Typed as `any` because
// ReturnType<typeof createClient> resolves generic type params strictly
// and doesn't match the instance we actually create below.
const clientRef: { current: any } = { current: null };

// Global fetch wrapper: when PostgREST returns "JWT expired" (PGRST303 / 401),
// refresh the session once and retry with the new access token. Without this,
// background-then-foreground transitions surface stale-token errors on every
// RPC (search_users, load_my_groups, get_my_invitations, …) until the user
// manually triggers a refresh.
const jwtAwareFetch = async (input: any, init?: RequestInit): Promise<Response> => {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;

  let isJwtExpired = false;
  try {
    const body = await res.clone().json();
    const msg = (body?.message ?? body?.msg ?? '').toString().toLowerCase();
    isJwtExpired = body?.code === 'PGRST303' || /jwt.*(expired|invalid)/.test(msg);
  } catch { /* non-JSON body */ }

  if (!isJwtExpired || !clientRef.current) return res;

  try { await clientRef.current.auth.refreshSession(); } catch { return res; }
  const { data } = await clientRef.current.auth.getSession();
  const newToken = data.session?.access_token;
  if (!newToken) return res;

  const headers = new Headers((init?.headers as any) ?? {});
  headers.set('Authorization', `Bearer ${newToken}`);
  return fetch(input, { ...(init ?? {}), headers });
};

export const supabase = createClient(
  SUPABASE_URL ?? 'http://localhost:54321',
  SUPABASE_ANON_KEY ?? 'missing-anon-key',
  {
    auth: {
      storage: AsyncStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: { fetch: jwtAwareFetch as any },
  },
);
clientRef.current = supabase;

// Supabase's auto-refresh timer gets paused when the JS runtime backgrounds.
// Without this, the first RPC after a long idle fires with an expired JWT.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
    supabase.auth.refreshSession().catch(() => { /* ignore */ });
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
supabase.auth.startAutoRefresh();

// ── Anonymous session ──────────────────────────────────────────
export async function ensureSession(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    void syncTimezone();
    return sessionData.session.user.id;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('Anonymous sign-in failed:', error);
    return null;
  }
  void syncTimezone();
  return data.session?.user.id ?? null;
}

// Push the device's IANA timezone to the server so profile_local_date()
// stamps blooms/streaks on the user's real local day (not the
// 'America/Phoenix' fallback). Fire-and-forget on every launch — cheap, and
// it self-heals when a user travels across zones. The RPC validates the
// name and only writes when it changed.
export async function syncTimezone(): Promise<void> {
  const tz = deviceTimeZone();
  if (!tz) return;
  try {
    await supabase.rpc('set_my_timezone', { p_timezone: tz });
  } catch { /* best effort — never block startup on this */ }
}

// ── Feedback ──────────────────────────────────────────────────
export async function submitFeedback(rating: number, comment: string, username: string | null): Promise<void> {
  const userId = await ensureSession();
  if (!userId) return;
  await supabase.from('app_feedback').insert({
    user_id: userId,
    username: username ?? null,
    rating: rating > 0 ? rating : null,
    comment: comment.trim() || null,
  });
}

// ── Profile ───────────────────────────────────────────────────
export async function saveProfileEmail(email: string): Promise<void> {
  try {
    await supabase.rpc('update_profile_email', { p_email: email });
  } catch { /* best effort */ }
}

/**
 * Save (or clear, when passed '') the caller's phone number. Used by the
 * Settings → Edit Profile "Phone" field. The server stores it for display
 * and, via update_profile_phone, claims any compliments already sent to
 * that number. Returns the stored value (normalized/blank), or null on error.
 */
export async function saveProfilePhone(phone: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('update_profile_phone', { p_phone: phone });
    if (error) {
      console.warn('saveProfilePhone error:', error.message);
      return null;
    }
    return (data as string | null) ?? null;
  } catch (e) {
    console.warn('saveProfilePhone failed:', e);
    return null;
  }
}

export async function loadProfileUsername(): Promise<{ username: string | null; email: string | null; phone: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return { username: null, email: null, phone: null };
  const { data } = await supabase
    .from('profiles')
    .select('username, email, phone')
    .eq('id', userId)
    .maybeSingle();
  return {
    username: data?.username ?? null,
    email: data?.email ?? null,
    phone: data?.phone ?? null,
  };
}

/**
 * Server-side Pro flag (profiles.is_pro). This is the cross-platform source
 * of truth: it's flipped by BOTH the Stripe webhook (web purchases) and the
 * RevenueCat webhook (mobile purchases), and is also set by manual admin
 * grants in the portal. Mobile must read it IN ADDITION to the RevenueCat
 * entitlement — otherwise Pro bought on the website (or granted by support)
 * stays invisible in the app and the user keeps hitting paywalls for
 * features they already own.
 *
 * Returns null on error / no session so callers can keep the cached state
 * instead of downgrading a paying user on a flaky network — same contract as
 * revenuecat.checkProStatus(). Reconcile the two with combineProStatus().
 */
export async function loadServerProStatus(): Promise<boolean | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    return Boolean((data as { is_pro?: boolean } | null)?.is_pro);
  } catch {
    return null;
  }
}

// ── Received / unread status ───────────────────────────────────
/** Count of compliments addressed to the signed-in user that they haven't
 *  seen yet. Drives the Recap-tab red dot. Returns 0 on any error. */
export async function loadUnreadReceivedCount(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_unread_received_count');
    if (error) return 0;
    return (data as number) ?? 0;
  } catch {
    return 0;
  }
}

/** Flip one compliment read when the recipient views it directly (push
 *  deep-link → ComplimentViewScreen). Best-effort: a viewer who isn't the
 *  recipient doesn't match the RPC's identity predicate and nothing flips.
 *  This is what makes the sender's Read receipt accurate for recipients
 *  who never open the Recap tab. */
export async function markComplimentRead(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('mark_compliment_read', { p_id: id });
    if (error) console.warn('[read-receipt] mark error:', error.message);
  } catch { /* best effort */ }
}

/** Mark all of the caller's received compliments as read (called when they
 *  open the Recap tab). Returns the number flipped; 0 on error. */
export async function markReceivedRead(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('mark_received_read');
    if (error) return 0;
    return (data as number) ?? 0;
  } catch {
    return 0;
  }
}

// ── Email lookup ───────────────────────────────────────────────
/**
 * Returns true if any profile row already has this email. Used by the
 * setup modal to skip the username step when a returning user types their
 * existing email — they just OTP in and their old data loads automatically.
 */
export async function emailExists(email: string): Promise<boolean> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes('@') || !trimmed.includes('.')) return false;
  const { data, error } = await supabase.rpc('email_exists', { p_email: trimmed });
  if (error) {
    console.warn('[email_exists] error:', error.message);
    return false;
  }
  return Boolean(data);
}

// ── Username ───────────────────────────────────────────────────
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const userId = await ensureSession();

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    // RLS may block anonymous users from reading profiles — assume available
    // and let upsert_profile catch any real duplicates via its unique constraint.
    return true;
  }
  return data === null || data.id === userId;
}

export async function saveUsername(username: string): Promise<{ success: boolean; error?: string; userId?: string }> {
  const userId = await ensureSession();
  if (!userId) return { success: false, error: 'Could not connect. Please check your internet connection.' };

  // SECURITY DEFINER RPC bypasses RLS — works for anonymous users
  const { error } = await supabase.rpc('upsert_profile', {
    p_user_id: userId,
    p_username: username,
  });

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Username already taken' };
    return { success: false, error: error.message };
  }
  return { success: true, userId };
}

// ── User search (for recipient picker) ───────────────────────
export interface UserSearchResult {
  user_id: string;
  username: string;
  display_name: string;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  // Usernames are stored without a leading '@', but the recipient picker
  // invites "@handle" input. Strip a leading '@' so "@test" still matches the
  // stored username "test" — otherwise the dropdown is empty and the sender
  // falls through to the free-text path (no recipient_id is set).
  const q = query.trim().replace(/^@+/, '');
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc('search_users', {
    p_query: q,
    p_limit: 10,
  });
  if (error) {
    console.warn('Search users error:', error.message);
    return [];
  }
  return (data as UserSearchResult[]) ?? [];
}

// ── Email linking ──────────────────────────────────────────────
// Step 1: Send OTP code to email
// Uses signInWithOtp which sends a 6-digit code, NOT a confirm-change link
export async function sendEmailOtp(email: string): Promise<{ success: boolean; error?: string }> {
  // Always create user if needed — Supabase silently drops the email when
  // shouldCreateUser:false and no matching auth user exists (no error, no email).
  // Setting true is safe: it creates the auth user for new emails, or just
  // sends OTP to existing ones. The merge step after verify handles both.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    console.warn('sendEmailOtp error:', error.message, error.status);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// Step 2: Verify OTP code and merge anonymous data into email user
export async function verifyEmailOtp(
  email: string,
  token: string
): Promise<{ success: boolean; userId: string | null; merged: boolean; anonUsername?: string; error?: string }> {
  // Save the current anonymous user ID and username BEFORE OTP switches the session.
  // Use getSession() (local cache) — getUser() makes a network call that can race or fail.
  const { data: sessionData } = await supabase.auth.getSession();
  const anonUserId = sessionData.session?.user.id ?? null;

  // Read username from the anon profile now — once the session switches the
  // profile query will target the email user's row instead.
  let anonUsername: string | undefined;
  if (anonUserId) {
    const { data: anonProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', anonUserId)
      .maybeSingle();
    anonUsername = anonProfile?.username ?? undefined;
  }

  // Verify the OTP — this switches the session to the email user
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    return { success: false, userId: null, merged: false, error: error.message };
  }

  const emailUserId = data.session?.user.id ?? null;

  // Merge anonymous user data into the email user
  let merged = false;
  if (emailUserId && anonUserId) {
    try {
      const { data: mergeResult, error: mergeError } = await supabase.rpc('merge_anonymous_to_email_user', {
        p_anon_user_id: anonUserId,
        p_email: email,
      });
      if (mergeError) {
        console.warn('Merge error:', mergeError.message);
      } else {
        merged = mergeResult?.merged ?? false;
      }
    } catch (e) {
      console.warn('Merge failed:', e);
    }
  }

  return { success: true, userId: emailUserId, merged, anonUsername };
}

// ── Load all data for the currently authenticated user ─────────
export interface UserData {
  streak: number;
  lastChallengeDate: string | null;
  username?: string;
  email?: string;
  groups: Array<{ id: string; name: string; invite_code: string; pinned_challenge: string | null; created_at: string; member_count: number; my_role: string }>;
  teams: Team[];
  complimentHistory: Array<{ id: string; date: string; prompt: string; recipient: string; body: string; createdAt: string }>;
}

export async function loadExistingUserData(_email?: string): Promise<UserData | null> {
  // Use getSession() (local cache) — more reliable than getUser() right after
  // a session change (OTP verification), where the network call can race or fail.
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, email')
    .eq('id', userId)
    .maybeSingle();

  // Load streak. The live column is `last_completed_on` — see
  // 20260513_fix_geo_leaderboard_column.sql for the full story (the local
  // schema dump's CREATE TABLE is stale on this detail; the corrective
  // comment in 20260430_compliments_schema_fix.sql is the accurate one).
  const { data: streakData } = await supabase
    .from('user_streaks')
    .select('current_streak, last_completed_on')
    .eq('user_id', userId)
    .maybeSingle();

  // Load groups (RPC uses auth.uid() internally)
  let groups: UserData['groups'] = [];
  try {
    const { data: groupsData } = await supabase.rpc('load_my_groups');
    groups = groupsData ?? [];
  } catch { /* no groups */ }

  // Load teams (RPC uses auth.uid() internally)
  let teams: Team[] = [];
  try {
    const { data: teamsData } = await supabase.rpc('load_my_teams');
    teams = teamsData ?? [];
  } catch { /* no teams */ }

  // Load compliment history.
  // Real table is `compliments` (probed live 2026-04-30), with `sender_id`
  // as the foreign key. The earlier `completions` / `user_id` reference
  // never resolved against this project and silently returned []. We use
  // the load_my_compliment_history RPC to bypass any lingering RLS
  // ambiguity — same reason the web client uses it.
  let complimentHistory: UserData['complimentHistory'] = [];
  try {
    const { data: histData } = await supabase.rpc('load_my_compliment_history', {
      p_limit: 50,
    });
    complimentHistory = ((histData as any[]) ?? []).map((row: any) => ({
      id: row.id,
      date: localDayOf(row.created_at),
      prompt: '',
      recipient: row.recipient_name ?? '',
      body: row.body ?? '',
      createdAt: row.created_at ?? '',
      recipientId: row.recipient_id ?? null,
      isRead: Boolean(row.is_read),
    }));
  } catch { /* no history */ }

  return {
    streak: streakData?.current_streak ?? 0,
    lastChallengeDate: streakData?.last_completed_on ?? null,
    username: profile?.username ?? undefined,
    email: profile?.email ?? undefined,
    groups,
    teams,
    complimentHistory,
  };
}

// ── Challenge / Streak helpers ─────────────────────────────────
export interface DailyChallenge {
  id: string;
  prompt: string;
  rule: string;
  example: string;
  why: string;
}

export async function loadTodaysPrompt(): Promise<DailyChallenge | null> {
  // Local date, not UTC: rotates the prompt at the user's local midnight.
  const today = todayLocal();
  const { data, error } = await supabase.rpc('get_daily_prompt', { p_for_date: today });
  if (error) {
    console.error('Prompt load error:', error);
    return null;
  }
  // RETURNS daily_prompts (a row). Defensively handle: row | row[] | null.
  const row = (Array.isArray(data) ? data[0] : data) as any;
  if (!row) return null;
  // Reject rows whose prompt is empty/null so the caller can keep using
  // the local CHALLENGES rotation. Otherwise the share card renders
  // "Today: null" which is the bug we're fixing.
  const text = (row.prompt_text ?? row.prompt ?? '').toString().trim();
  // Reject the literal string "null" / "undefined" (case-insensitive) — the
  // RPC sometimes returns these when the source row's column is unset, and
  // they would render as `Today: null` in the share card.
  if (!text || /^(null|undefined)$/i.test(text)) return null;
  return {
    id: row.id,
    prompt: text,
    rule: row.rule ?? '',
    example: row.example ?? '',
    why: row.why ?? '',
  };
}

/**
 * Daily-challenge submit.
 *
 * `recipientId` is set when the sender picked a registered user from
 * the search dropdown — the server uses it directly. When null, the
 * compliment still saves with just `recipient_name` and the caller
 * (BloomScreen → DoneScreen) surfaces a share-sheet card for the
 * sender to forward via iMessage / DM. The recipient lands on the
 * web `/c/<id>` page when they tap the link.
 *
 * Returns `{ completionId }` — the row id, used to build the public
 * share link `https://onecompliment.app/c/<id>`.
 */
export async function submitCompliment(
  body: string,
  promptId: string | null,
  recipientName: string,
  recipientId: string | null = null,
  recipientEmail: string | null = null,
  recipientPhone: string | null = null,
): Promise<{ completionId: string | null }> {
  const { data, error } = await supabase.rpc('complete_daily_prompt', {
    p_body: body,
    p_prompt_id: promptId,
    p_recipient_id: recipientId,
    p_recipient_name: recipientName,
    // When the recipient came from device contacts, the server matches this
    // email against existing accounts (delivering straight to their feed)
    // and stores both identifiers so a pending compliment can be claimed
    // when they sign up. Null for username picks / free-form names.
    p_recipient_email: recipientEmail,
    p_recipient_phone: recipientPhone,
  });
  if (error) throw error;
  // The RPC may return either { completion_id } or a row whose `id` is
  // the completion id, depending on how the live function is defined.
  const row = data as { completion_id?: string; id?: string } | null;
  const completionId = row?.completion_id ?? row?.id ?? null;
  triggerLocationUpdate();
  if (completionId) {
    // Fire-and-forget push to the recipient (if registered + opted in).
    import('./notifications').then(m => m.triggerComplimentPush(completionId, 'personal'));
  }
  return { completionId };
}

/**
 * Resolve which of the given contact emails already belong to a
 * OneCompliment account. Returns a map of lowercased email → username so the
 * contact picker can badge "on OneCompliment" up front. Email only — accounts
 * have no verified phone. Never throws; returns {} on any error.
 */
export async function resolveContactEmails(emails: string[]): Promise<Record<string, string>> {
  const clean = Array.from(
    new Set(emails.map(e => (e ?? '').trim().toLowerCase()).filter(Boolean)),
  );
  if (clean.length === 0) return {};
  try {
    const { data, error } = await supabase.rpc('resolve_contact_emails', { p_emails: clean });
    if (error || !Array.isArray(data)) return {};
    const map: Record<string, string> = {};
    for (const row of data as { email: string; username: string }[]) {
      if (row?.email && row?.username) map[row.email.toLowerCase()] = row.username;
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Phone counterpart to resolveContactEmails. Returns a map of the ORIGINAL
 * contact phone string → username for contacts whose number matches an
 * existing account (server-side normalize_phone handles formatting). The key
 * is the raw input so the caller can look up by the exact `contact.phone` it
 * passed. Never throws; returns {} on any error.
 */
export async function resolveContactPhones(phones: string[]): Promise<Record<string, string>> {
  const clean = Array.from(new Set(phones.map(p => (p ?? '').trim()).filter(Boolean)));
  if (clean.length === 0) return {};
  try {
    const { data, error } = await supabase.rpc('resolve_contact_phones', { p_phones: clean });
    if (error || !Array.isArray(data)) return {};
    const map: Record<string, string> = {};
    for (const row of data as { phone: string; username: string }[]) {
      if (row?.phone && row?.username) map[row.phone] = row.username;
    }
    return map;
  } catch {
    return {};
  }
}

// ── Public compliment (share-link / deep-link target) ──────────
export interface PublicCompliment {
  id: string;
  body: string;
  recipientName: string | null;
  senderUsername: string | null;
  senderDisplay: string | null;
  createdAt: string | null;
}

/**
 * Resolve a compliment by id for the `/c/:id` share link. Backed by the
 * public `get_public_compliment` RPC (granted to anon + authenticated, with
 * a 90-day expiry), so it works whether or not the viewer is signed in.
 * Returns null when the id is unknown or the link has expired.
 */
export async function loadPublicCompliment(id: string): Promise<PublicCompliment | null> {
  const { data, error } = await supabase.rpc('get_public_compliment', { p_id: id });
  if (error) {
    console.warn('loadPublicCompliment error:', error.message);
    return null;
  }
  const row = data as {
    id: string;
    body: string;
    recipient_name: string | null;
    sender_username: string | null;
    sender_display: string | null;
    created_at: string | null;
  } | null;
  if (!row) return null;
  return {
    id: row.id,
    body: row.body,
    recipientName: row.recipient_name ?? null,
    senderUsername: row.sender_username ?? null,
    senderDisplay: row.sender_display ?? null,
    createdAt: row.created_at ?? null,
  };
}

/**
 * Attach any still-pending compliments addressed to the signed-in user
 * (matched by their account email, or an optional phone) to their account.
 * Safe to call opportunistically — returns the number claimed, 0 when none
 * match or the user isn't signed in. Never throws.
 */
export async function claimPendingCompliments(phone?: string | null): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('claim_pending_compliments', {
      p_email: null,            // server defaults to the caller's profile email
      p_phone: phone ?? null,
    });
    if (error) {
      console.warn('claimPendingCompliments error:', error.message);
      return 0;
    }
    return (data as number) ?? 0;
  } catch (e) {
    console.warn('claimPendingCompliments failed:', e);
    return 0;
  }
}

/**
 * Fire-and-forget IP→geo lookup that updates profiles.location_city /
 * region / country / country_code for the caller. Called after a
 * successful compliment post (personal, team, group). Never blocks the
 * post and never throws — failure is silent by design.
 *
 * Capture is OPT-IN as of 2026-05-18. The edge function checks
 * profiles.location_share and returns early without doing any IP lookup
 * when the user has not enabled Local Leaderboard in Settings. Toggling
 * Local Leaderboard OFF also immediately purges the user's stored
 * city/region/country via the set_my_location_share RPC.
 *
 * lat/lng are not stored — those columns were dropped from profiles in
 * the same hardening pass.
 */
export function triggerLocationUpdate(): void {
  // Detached so the awaiting submit path returns immediately.
  void supabase.functions.invoke('update-my-location').catch((e) => {
    if (__DEV__) console.warn('[geo] update-my-location failed:', e?.message ?? e);
  });
}

// ── Geo leaderboard ─────────────────────────────────────────────
export type GeoLeaderboardScope = 'city' | 'region' | 'country';

export interface GeoLeaderboardRow {
  rank: number;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  current_streak: number;
  longest_streak: number;
  bloomed_today: boolean;
  is_me: boolean;
}

export interface GeoLeaderboardSummary {
  has_location: boolean;
  share: boolean;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  city_count?: number;
  region_count?: number;
  country_count?: number;
}

export async function loadGeoLeaderboard(scope: GeoLeaderboardScope = 'city', limit = 25): Promise<GeoLeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_geo_leaderboard', { p_scope: scope, p_limit: limit });
  if (error) {
    console.warn('[geo] leaderboard error:', error.message);
    return [];
  }
  return (data ?? []) as GeoLeaderboardRow[];
}

export async function loadGeoLeaderboardSummary(): Promise<GeoLeaderboardSummary> {
  const { data, error } = await supabase.rpc('get_geo_leaderboard_summary');
  if (error || !data) return { has_location: false, share: false };
  return data as GeoLeaderboardSummary;
}

export async function setMyLocationShare(share: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_my_location_share', { p_share: share });
  if (error) {
    console.warn('[geo] set share error:', error.message);
    return false;
  }
  return data === share;
}

export async function loadMyStreak() {
  // getSession() (local cache) rather than getUser() (network) — the latter
  // can race/fail right after a write, and the rest of this module already
  // standardized on getSession for that reason. maybeSingle() so a brand-new
  // user with no user_streaks row yet returns null instead of erroring.
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

// ── Streak freeze (Pro) ───────────────────────────────────────
// Server is the source of truth (streak_freezes table + RPCs from
// 20260428/20260616) — mirrors OneCompliment-site/src/lib/supabase.ts.
// The old Redux-only freeze never reached the server, so the next
// submit reset the streak anyway and Landing's focus-sync clobbered
// the local state within seconds.
export type StreakFreezeStatus = {
  available: boolean;
  used_today: boolean;
  last_used: string | null;
  next_available: string | null;
};

export async function getStreakFreezeStatus(): Promise<StreakFreezeStatus | null> {
  const { data, error } = await supabase.rpc('get_streak_freeze_status');
  if (error) {
    // RPC missing (migration not applied) or offline — treat as
    // "freezes unavailable" rather than throwing.
    console.warn('[freeze] status error:', error.message);
    return null;
  }
  return data as StreakFreezeStatus;
}

/**
 * Consume the weekly streak freeze for `forDate` (YYYY-MM-DD, device-local —
 * same date domain as challenge_date). Omitting it freezes the user's
 * local today. Named like the web export; import as useStreakFreezeRpc
 * in components to avoid reading like a React hook.
 */
export async function useStreakFreeze(forDate?: string): Promise<
  | { ok: true; freezeDate: string }
  | {
      ok: false;
      error: 'pro_required' | 'weekly_limit' | 'future_date' | 'not_needed' | string;
      nextAvailable?: string;
    }
> {
  const { data, error } = await supabase.rpc(
    'use_streak_freeze',
    forDate ? { p_for_date: forDate } : {},
  );
  if (error) return { ok: false, error: error.message };
  const result = data as
    | { ok?: true; freeze_date?: string; error?: string; next_available?: string }
    | null;
  if (result?.error) {
    return { ok: false, error: result.error, nextAvailable: result.next_available };
  }
  return { ok: true, freezeDate: result?.freeze_date ?? '' };
}

/**
 * Returns the user's most recent compliment from today, or null. Used
 * by LandingScreen to auto-navigate to Done when the user reopens the
 * app on a day they've already lifted. Mirrors the web implementation
 * exactly — same sender_id column, same local-midnight cutoff.
 */
export async function loadTodayCompletion(): Promise<{
  id: string;
  body: string;
  recipientName: string;
  recipientId: string | null;
} | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  const cutoffIso = cutoff.toISOString();

  const { data, error } = await supabase
    .from('compliments')
    .select('id, body, recipient_name, recipient_id, created_at')
    .eq('sender_id', userId)
    .gte('created_at', cutoffIso)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.warn('[loadTodayCompletion]', error.message);
    return null;
  }
  const row = (data as any[] | null)?.[0];
  if (!row) return null;
  return {
    id: row.id,
    body: row.body ?? '',
    recipientName: row.recipient_name ?? '',
    recipientId: row.recipient_id ?? null,
  };
}

// ── Teams ─────────────────────────────────────────────────────

export type TeamType = 'school' | 'organization' | 'general';

export interface Team {
  id: string;
  name: string;
  team_type: TeamType;
  invite_code: string;
  description: string | null;
  pinned_challenge: string | null;
  daily_theme: string | null;
  require_approval: boolean;
  shared_visibility: boolean;
  content_filter_enabled: boolean;
  parent_visibility: boolean;
  custom_prompts_only: boolean;
  member_limit: number | null;
  subscription_tier: string;
  created_at: string;
  my_role: 'admin' | 'moderator' | 'member';
  // 'pending' while an admin hasn't approved a join-by-code yet.
  my_status: 'pending' | 'approved';
  // Team-level approval gate — newly created teams are 'pending'
  // until a super_admin approves them from the admin portal.
  // load_my_teams exposes this via team_status; older rows default to 'approved'.
  team_status: 'pending' | 'approved' | 'rejected';
  team_rejection_reason: string | null;
  member_count: number;
  today_completions: number;
  pending_count: number;
  team_streak: number;
}

export interface PendingTeamMember {
  user_id: string;
  display_name: string;
  color: string;
  joined_at: string;
}

export interface TeamSubscription {
  tier_id: string;
  tier_name: string;
  max_members: number | null;
  price_monthly: number;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  max_members: number | null;
  price_monthly: number;
}

export interface TeamMember {
  user_id: string;
  display_name: string;
  color: string;
  role: 'admin' | 'moderator' | 'member';
  muted: boolean;
  streak: number;
  bloomed_today: boolean;
}

export interface TeamCompletion {
  id: string;
  user_id: string;
  display_name: string;
  color: string;
  recipient_name: string;
  body: string;
  prompt: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface TeamStreak {
  current_streak: number;
  longest_streak: number;
  last_completed_on: string | null;
}

export interface TeamParticipation {
  user_id: string;
  display_name: string;
  color: string;
  role: string;
  muted: boolean;
  streak: number;
  total_completions: number;
  recent_completions: number;
  active_days: number;
  bloomed_today: boolean;
}

export interface TeamDashboard {
  team: Team;
  members: TeamMember[];
  feed: TeamCompletion[];
  pending: TeamCompletion[];
  stats: {
    member_count: number;
    today_completions: number;
    total_completions: number;
    completion_rate: number;
    pending_count: number;
  };
  team_streak: TeamStreak | null;
  subscription: TeamSubscription | null;
}

export async function createTeam(
  name: string, teamType: TeamType, displayName: string, description?: string
): Promise<{ team_id: string; invite_code: string } | { error: string }> {
  const { data, error } = await withFreshSession(() =>
    supabase.rpc('create_team', {
      p_name: name, p_team_type: teamType, p_display_name: displayName,
      p_description: description ?? null,
    })
  );
  if (error) return { error: error.message };
  return data;
}

export async function joinTeam(
  inviteCode: string, displayName: string
): Promise<{ team_id: string; team_name: string; team_type: string } | { error: string }> {
  const { data, error } = await supabase.rpc('join_team', {
    p_invite_code: inviteCode, p_display_name: displayName,
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return data;
}

export async function leaveTeam(teamId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_team', { p_team_id: teamId });
  if (error) throw error;
}

export async function removeTeamMember(teamId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_team_member', {
    p_team_id: teamId, p_target_user_id: targetUserId,
  });
  if (error) throw error;
}

export async function getTeamPendingMembers(teamId: string): Promise<PendingTeamMember[]> {
  const { data, error } = await supabase.rpc('get_team_pending_members', { p_team_id: teamId });
  if (error) { console.warn('Pending members error:', error.message); return []; }
  return (data as PendingTeamMember[]) ?? [];
}

export async function approveTeamMember(teamId: string, targetUserId: string): Promise<boolean> {
  const { error } = await supabase.rpc('approve_team_member', {
    p_team_id: teamId, p_target_user_id: targetUserId,
  });
  if (error) { console.warn('Approve team member error:', error.message); return false; }
  return true;
}

export async function toggleMuteMember(teamId: string, targetUserId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_team_member_mute', {
    p_team_id: teamId, p_target_user_id: targetUserId,
  });
  if (error) throw error;
  return data;
}

export async function submitTeamCompletion(
  teamId: string, body: string, recipientName: string, prompt?: string
): Promise<{ completion_id: string; status: string } | { error: string }> {
  const { data, error } = await supabase.rpc('submit_team_completion', {
    p_team_id: teamId, p_body: body, p_recipient_name: recipientName,
    p_prompt: prompt ?? null,
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  triggerLocationUpdate();
  const teamCompletionId = (data as { completion_id?: string } | null)?.completion_id;
  if (teamCompletionId) {
    import('./notifications').then(m => m.triggerComplimentPush(teamCompletionId, 'team'));
  }
  return data;
}

export async function moderateCompletion(
  completionId: string, action: 'approve' | 'reject', reason?: string
): Promise<void> {
  const { error } = await supabase.rpc('moderate_team_completion', {
    p_completion_id: completionId, p_action: action, p_reason: reason ?? null,
  });
  if (error) throw error;
  // On approval, fire the push that was held back at submit time. The Edge
  // Function explicitly allows moderator-as-caller for status='approved'
  // team completions, so this works even though the moderator isn't the
  // original sender.
  if (action === 'approve') {
    import('./notifications').then(m => m.triggerComplimentPush(completionId, 'team'));
  }
}

export async function updateTeamSettings(teamId: string, settings: {
  name?: string; description?: string; daily_theme?: string; pinned_challenge?: string;
  require_approval?: boolean; shared_visibility?: boolean;
  content_filter_enabled?: boolean; parent_visibility?: boolean; custom_prompts_only?: boolean;
}): Promise<void> {
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
  });
  if (error) throw error;
}

export async function loadMyTeams(): Promise<Team[]> {
  const { data, error } = await supabase.rpc('load_my_teams');
  if (error) { console.warn('Load teams error:', error.message); return []; }
  return data ?? [];
}

export async function loadTeamDashboard(teamId: string): Promise<TeamDashboard | null> {
  const { data, error } = await supabase.rpc('get_team_dashboard', { p_team_id: teamId });
  if (error) { console.warn('Dashboard error:', error.message); return null; }
  return data;
}

export async function loadTeamAnalytics(teamId: string, days = 7) {
  const { data, error } = await supabase.rpc('get_team_analytics', {
    p_team_id: teamId, p_days: days,
  });
  if (error) { console.warn('Analytics error:', error.message); return null; }
  return data;
}

export async function addTeamPrompt(teamId: string, promptText: string, activeDate?: string) {
  const { data, error } = await supabase.rpc('add_team_prompt', {
    p_team_id: teamId, p_prompt_text: promptText, p_active_date: activeDate ?? null,
  });
  if (error) throw error;
  return data;
}

export async function setTeamMemberRole(
  teamId: string, targetUserId: string, role: 'admin' | 'moderator' | 'member'
): Promise<void> {
  const { error } = await supabase.rpc('set_team_member_role', {
    p_team_id: teamId, p_target_user_id: targetUserId, p_role: role,
  });
  if (error) throw error;
}

export async function loadTeamParticipation(teamId: string, days = 7): Promise<TeamParticipation[]> {
  const { data, error } = await supabase.rpc('get_team_participation', {
    p_team_id: teamId, p_days: days,
  });
  if (error) { console.warn('Participation error:', error.message); return []; }
  return data ?? [];
}

export async function loadTeamDailyPrompt(teamId: string): Promise<{ id: string; prompt_text: string } | null> {
  const { data, error } = await supabase.rpc('get_team_daily_prompt', { p_team_id: teamId });
  if (error) { console.warn('Team prompt error:', error.message); return null; }
  return data;
}

export async function updateTeamDisplayName(teamId: string, displayName: string): Promise<void> {
  const { error } = await supabase.rpc('update_team_display_name', {
    p_team_id: teamId,
    p_display_name: displayName,
  });
  if (error) throw error;
}

// ── Team Subscriptions ───────────────────────────────────────────

export async function loadSubscriptionTiers(): Promise<SubscriptionTier[]> {
  const { data, error } = await supabase
    .from('team_subscription_tiers')
    .select('*')
    .order('price_monthly', { ascending: true });
  if (error) { console.warn('Tiers error:', error.message); return []; }
  return data ?? [];
}

export async function loadTeamSubscription(teamId: string): Promise<TeamSubscription | null> {
  const { data, error } = await supabase.rpc('get_team_subscription', { p_team_id: teamId });
  if (error) { console.warn('Subscription error:', error.message); return null; }
  return data;
}

export async function activateTeamSubscription(
  teamId: string, tierId: string, externalId?: string
): Promise<{ tier: string; max_members: number | null; price: number } | { error: string }> {
  const { data, error } = await supabase.rpc('activate_team_subscription', {
    p_team_id: teamId, p_tier_id: tierId, p_external_id: externalId ?? null,
  });
  if (error) return { error: error.message };
  return data;
}

// ── Invitations ──────────────────────────────────────────────────

export interface Invitation {
  id: string;
  entity_type: 'team' | 'group';
  entity_id: string;
  entity_name: string;
  team_type: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invited_by_name: string | null;
  created_at: string;
  expires_at: string;
}

export interface SentInvitation {
  id: string;
  email: string;
  status: string;
  invited_by_name: string | null;
  created_at: string;
  expires_at: string;
}

const INVITE_BASE_URL = 'https://onecompliment.app/join';
// Edge-function endpoints MUST live on the same project as the DB/auth — the
// anon key we send below is scoped to SUPABASE_URL's project, so a hardcoded
// different project ref fails the apikey check (this previously pointed at a
// stale project, which silently broke account deletion — an App Store
// rejection — and invite emails). Derive from SUPABASE_URL so they can never
// drift apart. Fallback mirrors the createClient fallback above.
const FUNCTIONS_BASE = `${SUPABASE_URL ?? 'http://localhost:54321'}/functions/v1`;
const INVITE_EMAIL_FN_URL = `${FUNCTIONS_BASE}/send-invitation-email`;
const DELETE_ACCOUNT_FN_URL = `${FUNCTIONS_BASE}/delete-account`;

// ── Account deletion ──────────────────────────────────────────
// Calls the delete-account edge function which verifies the caller's JWT
// and then calls auth.admin.deleteUser(). ON DELETE CASCADE on every
// public.* FK back to auth.users cleans up the rest.
// On success the local session is cleared so the UI drops back to the
// anonymous / onboarding state without a dangling expired token.
export async function deleteMyAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, error: 'Not signed in — nothing to delete.' };

  try {
    const res = await fetch(DELETE_ACCOUNT_FN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        msg = body?.error ?? body?.message ?? msg;
      } catch { /* non-JSON body */ }
      return { ok: false, error: msg };
    }

    try { await supabase.auth.signOut(); } catch { /* already gone server-side */ }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

export interface InviteSendResult {
  sent: number;
  skipped: number;
  /** True when the edge function delivered the email via SMTP.
   *  False when not deployed / SMTP not configured / other delivery error.
   *  Use this to decide whether to fall back to a share sheet. */
  emailDelivered: boolean;
  /** Human-readable reason SMTP delivery failed. Populated only when
   *  emailDelivered is false. Examples: "Edge Function returned a non-2xx
   *  status code", "SMTP credentials not configured",
   *  "Function not found: send-invitation-email". */
  deliveryError: string | null;
  /** mailto: URL the UI can open so the admin can send from their own
   *  mail client. Pre-fills subject, BCC (all recipients), and body with
   *  the join link. May not work on emulators with no mail app — prefer
   *  shareMessage below for the React Native Share API. */
  mailtoUrl: string | null;
  /** Plain-text share message (no recipients) suitable for the RN Share
   *  API. Admin picks WhatsApp / SMS / email / etc. and the link is
   *  pre-filled. Works on emulators and devices without a mail app. */
  shareMessage: string | null;
  /** Emails the DB RPC accepted as new pending invitations (subset of
   *  the request — already-members and bad addresses are filtered out). */
  acceptedEmails: string[];
  /** Public join link, so callers can build custom share messages. */
  joinUrl: string | null;
  /** Entity display name for UI copy. */
  entityName: string | null;
}

function buildMailto(
  entityType: 'team' | 'group',
  entityName: string,
  joinUrl: string | null,
  inviterName: string | null,
  emails: string[],
): string | null {
  if (emails.length === 0 || !joinUrl) return null;
  const word = entityType === 'team' ? 'team' : 'group';
  const who = inviterName ?? 'A friend';
  const subject = `Join ${entityName} on OneCompliment`;
  const body =
`${who} invited you to join the ${word} "${entityName}" on OneCompliment.

Tap the link to accept:
${joinUrl}

This invitation expires in 7 days.`;
  // bcc= keeps recipients private from each other.
  const bcc = emails.join(',');
  return `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function dispatchInvitationEmails(
  entityType: 'team' | 'group',
  entityId: string,
  emails: string[],
): Promise<{ delivered: boolean; error: string | null }> {
  if (emails.length === 0) return { delivered: true, error: null };

  // The function only reads email/entity_type/entity_id — it re-derives
  // the entity name, invite code, join URL, and inviter name from the DB
  // after matching each recipient to the pending `invitations` row the
  // SQL RPC just created. Display fields sent from here would be ignored
  // (open-relay hardening), so we don't send them.
  const payload = {
    invites: emails.map(email => ({
      email,
      entity_type: entityType,
      entity_id: entityId,
    })),
  };

  // Parse whatever the gateway / function returned. Supabase gateway
  // errors use .msg, our function uses .error, other services .message.
  const parseErr = (body: any, status: number, statusText: string): string => {
    const fromBody = body?.error ?? body?.msg ?? body?.message
      ?? (typeof body === 'string' ? body : null);
    return fromBody ?? `HTTP ${status} ${statusText || ''}`.trim();
  };

  try {
    // Refresh first so the attempt uses a fresh JWT (prevents stale-
    // token 401s when the app has been backgrounded a while).
    try { await supabase.auth.refreshSession(); } catch { /* ignore */ }

    // The function requires a signed-in caller — it verifies the bearer
    // token in-function and matches invites to invitation rows the caller
    // created. There is deliberately NO unauthenticated fallback: that
    // path only existed when the function trusted its payload, which made
    // it an open relay for branded phishing mail.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return { delivered: false, error: 'Session expired — please try again.' };
    }

    const res = await fetch(INVITE_EMAIL_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    let body: any = null;
    try { body = await res.json(); } catch { /* non-JSON */ }

    if (!res.ok) {
      const reason = parseErr(body, res.status, res.statusText);
      console.warn('send-invitation-email non-2xx:', res.status, reason, body);
      if (res.status === 401) {
        return { delivered: false, error: 'Session expired — please try again.' };
      }
      if (res.status === 404) {
        return {
          delivered: false,
          error: 'Function not deployed. Run: supabase functions deploy send-invitation-email',
        };
      }
      return { delivered: false, error: reason };
    }

    // Edge function returns { sent, errors }.
    const sent = body?.sent ?? 0;
    const errs = body?.errors ?? [];
    if (sent > 0) return { delivered: true, error: null };
    const firstErr = errs[0]?.error;
    return {
      delivered: false,
      error: firstErr ? `Delivery failed: ${firstErr}` : 'Delivery failed: 0 emails sent',
    };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.warn('Invitation email dispatch failed:', msg);
    return { delivered: false, error: msg };
  }
}

function buildShareMessage(
  entityType: 'team' | 'group',
  entityName: string,
  joinUrl: string | null,
  inviterName: string | null,
): string | null {
  if (!joinUrl) return null;
  const word = entityType === 'team' ? 'team' : 'group';
  const who = inviterName ?? 'Someone';
  return `${who} invited you to join the ${word} "${entityName}" on OneCompliment.\n\n${joinUrl}`;
}

export async function sendTeamInvitations(
  teamId: string, emails: string[]
): Promise<InviteSendResult | { error: string }> {
  const { data, error } = await supabase.rpc('send_team_invitation', {
    p_team_id: teamId, p_emails: emails,
  });
  if (error) return { error: error.message };

  const accepted: string[] = data.emails ?? [];
  const joinUrl = data.invite_code ? `${INVITE_BASE_URL}/team/${data.invite_code}` : null;
  const dispatch = await dispatchInvitationEmails('team', teamId, accepted);
  return {
    sent: data.sent,
    skipped: data.skipped,
    emailDelivered: dispatch.delivered,
    deliveryError: dispatch.error,
    mailtoUrl: buildMailto('team', data.team_name, joinUrl, data.inviter_name, accepted),
    shareMessage: buildShareMessage('team', data.team_name, joinUrl, data.inviter_name),
    acceptedEmails: accepted,
    joinUrl,
    entityName: data.team_name ?? null,
  };
}

export async function sendGroupInvitations(
  groupId: string, emails: string[]
): Promise<InviteSendResult | { error: string }> {
  const { data, error } = await supabase.rpc('send_group_invitation', {
    p_group_id: groupId, p_emails: emails,
  });
  if (error) return { error: error.message };

  const accepted: string[] = data.emails ?? [];
  const joinUrl = data.invite_code ? `${INVITE_BASE_URL}/group/${data.invite_code}` : null;
  const dispatch = await dispatchInvitationEmails('group', groupId, accepted);
  return {
    sent: data.sent,
    skipped: data.skipped,
    emailDelivered: dispatch.delivered,
    deliveryError: dispatch.error,
    mailtoUrl: buildMailto('group', data.group_name, joinUrl, data.inviter_name, accepted),
    shareMessage: buildShareMessage('group', data.group_name, joinUrl, data.inviter_name),
    acceptedEmails: accepted,
    joinUrl,
    entityName: data.group_name ?? null,
  };
}

export async function loadMyInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase.rpc('get_my_invitations');
  if (error) { console.warn('Invitations error:', error.message); return []; }
  return data ?? [];
}

// If a call returns "JWT expired", refresh the access token and run `fn`
// again. Supabase only retries automatically while the app is foreground-
// active; after long idle periods the first tap may still hit an expired
// token. This wrapper makes the second attempt succeed transparently.
async function withFreshSession<T>(fn: () => PromiseLike<T>): Promise<T> {
  const first = await fn();
  const err = (first as any)?.error;
  const msg = typeof err === 'string' ? err : err?.message;
  if (msg && /jwt (expired|invalid)/i.test(msg)) {
    try { await supabase.auth.refreshSession(); } catch { /* ignore */ }
    return await fn();
  }
  return first;
}

export async function acceptInvitation(
  invitationId: string, displayName: string
): Promise<{ success: boolean; entity_type: string; entity_id: string } | { error: string }> {
  const { data, error } = await withFreshSession(() =>
    supabase.rpc('accept_invitation', {
      p_invitation_id: invitationId, p_display_name: displayName,
    })
  );
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return data;
}

export async function declineInvitation(invitationId: string): Promise<void> {
  const { error } = await withFreshSession(() =>
    supabase.rpc('decline_invitation', { p_invitation_id: invitationId })
  );
  if (error) throw error;
}

export async function loadEntityInvitations(
  entityType: 'team' | 'group', entityId: string
): Promise<SentInvitation[]> {
  const { data, error } = await supabase.rpc('get_entity_invitations', {
    p_entity_type: entityType, p_entity_id: entityId,
  });
  if (error) { console.warn('Entity invitations error:', error.message); return []; }
  return data ?? [];
}

// ── Received compliments ───────────────────────────────────────
export interface ReceivedCompliment {
  id: string;
  body: string;
  senderUsername: string;
  /** 'personal' | 'group' | 'team' — where the compliment was sent from. */
  source: 'personal' | 'group' | 'team';
  /** Name of the group/team if source !== 'personal'. */
  contextName: string | null;
  createdAt: string;
  date: string;
}

/**
 * Returns compliments addressed to the current user across personal,
 * group, and team feeds — most recent first.
 *
 * Goes through the `load_received_compliments` RPC (rebuilt 20260613,
 * extended 20260617): it matches by recipient_id, username, email AND
 * phone — the direct table selects this used to run matched fewer rows
 * — and it enforces the Pro history window server-side (7 days free /
 * 365 Pro), so free clients never receive archive rows they'd have to
 * hide. (The old "RPC hits the wrong schema" caveat predates the
 * 20260613 rebuild and no longer applies.)
 */
export async function loadReceivedCompliments(limit = 50): Promise<ReceivedCompliment[]> {
  const { data, error } = await supabase.rpc('load_received_compliments', { p_limit: limit });
  if (error) {
    console.warn('[loadReceived] rpc error:', error.message);
    return [];
  }

  const rows = ((data as any[]) ?? []).map((r) => ({
    id: r.id as string,
    body: (r.body as string) ?? '',
    senderUsername: (r.sender_username as string) ?? 'Someone',
    source: (r.source as 'personal' | 'group' | 'team') ?? 'personal',
    contextName: (r.context_name as string | null) ?? null,
    createdAt: (r.created_at as string) ?? '',
    date: localDayOf(r.created_at as string),
  }));

  // Logical-equivalence dedup: same sender + same body + same day = same
  // compliment (a cross-write shows up in `compliments` AND
  // `group_completions` under different ids). Prefer the entry with
  // richer context (group/team beats bare personal) so the recipient
  // sees one card with full provenance instead of two duplicates.
  const sourceRank = { personal: 0, group: 1, team: 1 } as const;
  const byKey = new Map<string, ReceivedCompliment>();
  for (const c of rows) {
    const key = `${c.senderUsername}|${(c.body ?? '').trim()}|${c.date}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, c);
      continue;
    }
    const pickNew =
      sourceRank[c.source] > sourceRank[existing.source] ||
      (sourceRank[c.source] === sourceRank[existing.source] &&
        c.createdAt > existing.createdAt);
    if (pickNew) byKey.set(key, c);
  }

  return Array.from(byKey.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ── History gate (Pro) ─────────────────────────────────────────
// The server now withholds entries beyond the free 7-day window, so a
// free client can't count "hidden" rows by diffing fetch vs render —
// this RPC reports the counts so the upsell card stays accurate.
export type HistoryGateInfo = {
  is_pro: boolean;
  hidden_sent: number;
  hidden_received: number;
};

export async function getHistoryGateInfo(): Promise<HistoryGateInfo | null> {
  const { data, error } = await supabase.rpc('get_history_gate_info');
  if (error) {
    console.warn('[historyGate] rpc error:', error.message);
    return null;
  }
  return data as HistoryGateInfo;
}

// ── Compliment history ─────────────────────────────────────────
// Backed by load_my_compliment_history RPC against the `compliments`
// table — the assumed `completions` table doesn't exist in this
// project (probed 2026-04-30).
export async function loadComplimentHistory(limit = 50): Promise<{
  id: string;
  date: string;
  prompt: string;
  recipient: string;
  body: string;
  createdAt: string;
}[]> {
  const { data, error } = await supabase.rpc('load_my_compliment_history', {
    p_limit: limit,
  });

  if (error) {
    console.warn('Load history error:', error.message);
    return [];
  }

  const mapped = ((data as any[]) ?? []).map((row: any) => ({
    id: row.id,
    // Local calendar day, NOT created_at.slice(0,10) (= UTC day): the
    // one-per-day dedup below hid a legitimate evening compliment for
    // users west of UTC, and "Today" labels were off by one.
    date: localDayOf(row.created_at),
    prompt: '',
    recipient: row.recipient_name ?? '',
    body: row.body ?? '',
    createdAt: row.created_at ?? '',
    recipientId: row.recipient_id ?? null,
    isRead: Boolean(row.is_read),
  }));

  // Defensive dedup by date — server-side trigger now enforces the
  // one-per-day rule (see migrations/20260501_one_compliment_per_day.sql)
  // but any duplicates created before that migration was applied still
  // sit in compliments. Keep the most recent row per date so the Recap
  // shows a single entry per day even on legacy data.
  const seenDate = new Set<string>();
  return mapped.filter((c) => {
    if (!c.date) return true;
    if (seenDate.has(c.date)) return false;
    seenDate.add(c.date);
    return true;
  });
}

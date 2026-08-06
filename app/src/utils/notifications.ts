// OneSignal-backed notifications.
//
// What changed (was Expo-notifications based):
//   - Push tokens are gone; we identify users to OneSignal via `external_id`
//     set to the Supabase user id. Sends from the server target by external_id.
//   - Daily Reminder and Streak-at-Risk reminders are now SERVER-SCHEDULED via
//     OneSignal's REST API (the Edge Function `schedule-user-reminders`).
//     Tradeoffs accepted by the user: server-driven means no offline delivery,
//     ~minutes of timing jitter, and one OneSignal send counts per scheduled
//     reminder. See migration note in CHANGELOG / commit message.
//
// Permission model is unchanged from the user's POV:
//   undetermined  → prompt
//   granted       → register (link external_id) + schedule reminders
//   denied        → silent — free-form features still work without push

import { OneSignal } from 'react-native-onesignal';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Current notification permission WITHOUT prompting. Use at app launch so we
 * never trigger a cold OS permission dialog (App Store Guideline 5.1.1 — the
 * prompt must be contextual). The actual prompt lives in onboarding's
 * notifications step and the Settings toggle.
 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await OneSignal.Notifications.getPermissionAsync();
  } catch (e) {
    console.warn('[notif] getPermissionAsync failed:', (e as Error)?.message ?? e);
    return false;
  }
}

/** Ask the OS for notification permission. Returns true if granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    // `true` = fall through to OS-level prompt when the user hasn't decided yet.
    // OneSignal short-circuits to the existing status if already granted/denied.
    const granted = await OneSignal.Notifications.requestPermission(true);
    return granted === true;
  } catch (e) {
    console.error('[notif] requestPermission failed:', (e as Error)?.message ?? e);
    return false;
  }
}

/**
 * Identify the current Supabase user to OneSignal so server-side sends can
 * target this user. Safe to call repeatedly; OneSignal handles dedup.
 * Returns the OneSignal user id on success, or null when there's nothing to
 * link (no Supabase session, or permission not granted yet).
 */
export async function registerPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  // Guard against a sign-out / account switch that raced between the read
  // above and this point — never alias the device to a session that's no
  // longer active, or another user's recipient pushes would land here.
  const { data: recheck } = await supabase.auth.getUser();
  if (recheck.user?.id !== userId) return null;

  try {
    OneSignal.login(userId);
  } catch (e) {
    console.error('[notif] OneSignal.login failed:', (e as Error)?.message ?? e);
    return null;
  }

  // Pull the OneSignal id so the server has a stable handle even before the
  // first push (OneSignal's external_id index has a small propagation delay).
  let onesignalUserId: string | null = null;
  try {
    onesignalUserId = (await OneSignal.User.getOnesignalId()) ?? null;
  } catch (e) {
    console.warn('[notif] getOnesignalId failed:', (e as Error)?.message ?? e);
  }

  // Record the id on the profile so the Edge Function has a stable secondary
  // alias. This MUST go through an RPC: profiles has no self-UPDATE RLS
  // policy, so a direct `.update()` here silently affects 0 rows (error null)
  // and the id would never persist. Don't block on failure; next launch retries.
  if (onesignalUserId) {
    const { error } = await supabase.rpc('set_onesignal_user_id', {
      p_onesignal_user_id: onesignalUserId,
    });
    if (error) console.error('[notif] persist onesignal_user_id failed:', error.message);
  }
  console.log('[notif] registered user', userId, '→', onesignalUserId);
  return onesignalUserId;
}

/** Clear the OneSignal identity (e.g. sign-out). Schedules and pushes
 * targeting this Supabase user will stop reaching this device. */
export async function unregisterPushToken(): Promise<void> {
  try {
    OneSignal.logout();
  } catch (e) {
    console.warn('[notif] OneSignal.logout failed:', (e as Error)?.message ?? e);
  }
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  // Via RPC — direct profile UPDATEs are blocked by RLS (see registerPushToken).
  const { error } = await supabase.rpc('set_onesignal_user_id', {
    p_onesignal_user_id: null,
  });
  if (error) console.warn('[notif] clear onesignal_user_id failed:', error.message);
}

// ── Scheduled reminders (server-driven via OneSignal) ──────────────────
//
// The Edge Function `schedule-user-reminders` owns the OneSignal REST API
// calls. It accepts an action ('daily' | 'streak' | 'cancel-all') and
// any per-action params (time, streak length).

async function callScheduleEdgeFn(
  action: 'daily' | 'streak' | 'cancel-all',
  params: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('schedule-user-reminders', {
      body: { action, ...params },
    });
    if (error) console.warn('[notif] schedule-user-reminders failed:', error.message);
  } catch (e) {
    console.warn('[notif] schedule-user-reminders threw:', (e as Error)?.message ?? e);
  }
}

/** Schedule the recurring daily reminder. `timeStr` is "HH:MM" in the
 * device's local time. The Edge Function converts to the user's stored
 * timezone before submitting to OneSignal. */
export async function scheduleDailyReminder(timeStr: string): Promise<void> {
  const [hours, minutes] = timeStr.split(':').map(Number);
  await callScheduleEdgeFn('daily', { hours, minutes });
}

/** Schedule a one-shot "your streak is at risk" reminder for 8 PM tonight,
 * but only if streak ≥ 3 and 8 PM hasn't already passed in the user's TZ. */
export async function scheduleStreakAtRiskReminder(streak: number): Promise<void> {
  if (streak < 3) return;
  await callScheduleEdgeFn('streak', { streak });
}

/** Cancel every reminder scheduled by this user. */
export async function cancelAllReminders(): Promise<void> {
  await callScheduleEdgeFn('cancel-all');
}

// ── Compliment push (sent in response to compliment creation) ──────────
//
// Same fire-and-forget contract as before: client calls this immediately
// after a successful submit; the Edge Function does the spoof-check and
// the actual send via OneSignal REST.

export function triggerComplimentPush(
  completionId: string,
  source: 'personal' | 'team' | 'group',
): void {
  if (!completionId) return;
  void supabase.functions
    .invoke('send-compliment-push', { body: { completionId, source } })
    .catch((e) => {
      console.warn('[notif] send-compliment-push failed:', (e as Error)?.message ?? e);
    });
}

// ── Per-user opt-in for received-compliment pushes ─────────────────────
// `notify_on_received` is a column on `profiles`. The Edge Function reads
// it before sending, so toggling here takes effect on the next compliment.

export async function getNotifyOnReceived(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return true;
  const { data } = await supabase
    .from('profiles')
    .select('notify_on_received')
    .eq('id', userId)
    .single();
  return (data?.notify_on_received as boolean | undefined) ?? true;
}

export async function setNotifyOnReceived(value: boolean): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;
  // Via RPC — profiles has no self-UPDATE RLS policy, so a direct `.update()`
  // here updated 0 rows and returned error null: the toggle LOOKED saved but
  // the opt-out never took effect and opted-out users kept getting pushed.
  const { error } = await supabase.rpc('set_notify_on_received', { p_value: value });
  if (error) {
    console.warn('[notif] setNotifyOnReceived failed:', error.message);
    return false;
  }
  return true;
}

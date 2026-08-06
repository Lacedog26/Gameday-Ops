/**
 * Local-only preferences. Identity / streak / groups now come from Supabase.
 * Anything that doesn't need a server round-trip lives here.
 */
import { todayLocal } from './dates'

const KEYS = {
  onboarded: 'oc_onboarded',
  notifEnabled: 'oc_notif_enabled',
  notifTime: 'oc_notif_time',
  cookieChoice: 'oc_cookie_choice',
  // Snapshot of "I lifted today" so a page refresh instantly renders
  // the Done celebration instead of flashing Landing while the auth
  // session bootstraps + loadTodayCompletion round-trips. The server
  // is still authoritative — if the auth-dep effect finds no row, the
  // snapshot gets cleared.
  todayLift: 'oc_today_lift',
} as const

export type TodayLiftSnapshot = {
  /** ISO date (YYYY-MM-DD). Mismatch with today → snapshot is stale, ignore. */
  date: string
  recipient: string
  response: string
  recipientUserId: string | null
  completionId: string | null
}

export const storage = {
  isOnboarded: () => localStorage.getItem(KEYS.onboarded) === '1',
  setOnboarded: () => localStorage.setItem(KEYS.onboarded, '1'),

  getNotifEnabled: () => localStorage.getItem(KEYS.notifEnabled) === '1',
  setNotifEnabled: (enabled: boolean) =>
    localStorage.setItem(KEYS.notifEnabled, enabled ? '1' : '0'),

  getNotifTime: () => localStorage.getItem(KEYS.notifTime) || '09:00',
  setNotifTime: (time: string) => localStorage.setItem(KEYS.notifTime, time),

  // saveFeedback was removed: it wrote feedback into localStorage and
  // nothing ever sent it anywhere. Feedback now goes through
  // lib/supabase.ts submitFeedback → the app_feedback table.

  getCookieChoice: () =>
    localStorage.getItem(KEYS.cookieChoice) as 'accepted' | 'rejected' | null,
  setCookieChoice: (choice: 'accepted' | 'rejected') =>
    localStorage.setItem(KEYS.cookieChoice, choice),

  /** Returns the cached "today's lift" snapshot ONLY if it's actually
   *  from today. Stale snapshots (yesterday or older) return null and
   *  are cleared on the way out so the next call doesn't repeat the
   *  parse work. */
  getTodayLift(): TodayLiftSnapshot | null {
    const raw = localStorage.getItem(KEYS.todayLift)
    if (!raw) return null
    try {
      const snap = JSON.parse(raw) as TodayLiftSnapshot
      const today = todayLocal()
      if (snap.date !== today) {
        localStorage.removeItem(KEYS.todayLift)
        return null
      }
      return snap
    } catch {
      localStorage.removeItem(KEYS.todayLift)
      return null
    }
  },
  setTodayLift(snap: Omit<TodayLiftSnapshot, 'date'>) {
    const today = todayLocal()
    localStorage.setItem(KEYS.todayLift, JSON.stringify({ ...snap, date: today }))
  },
  clearTodayLift() {
    localStorage.removeItem(KEYS.todayLift)
  },
}

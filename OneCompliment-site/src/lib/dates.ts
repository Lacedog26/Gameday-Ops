// Local-calendar date helpers. Mirrors the mobile app's src/utils/dates.ts
// so web and mobile agree on what "today" is.
//
// The bug this fixes: the site computed "today" as
//   new Date().toISOString().slice(0, 10)
// which is the UTC calendar day. For anyone west of UTC (all of the
// Americas) that flips at 5–8pm local, so a user who lifted in the evening
// could see "you haven't bloomed today" / get the wrong daily prompt for the
// hours their local date trails UTC. The server already keys streaks and the
// daily prompt off each user's LOCAL date (profile_local_date / get_daily_prompt
// with a local p_for_date), so the client must pass its local date too.

/** YYYY-MM-DD in the device's local timezone (not UTC). */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today's local calendar day as YYYY-MM-DD. */
export const todayLocal = (): string => localDateString()

/** Device-local YYYY-MM-DD of an ISO timestamp ('' when empty/invalid).
 *  Use this instead of `iso.slice(0, 10)`, which yields the UTC day — an
 *  evening send west of UTC lands on "tomorrow", breaking Today labels
 *  and one-per-day dedup. */
export function localDayOf(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return localDateString(d)
}

/** The device's IANA timezone (e.g. "America/New_York"), or null if the
 *  browser can't resolve it. Sent to the server so profile_local_date keys
 *  streak rollover off the user's real timezone. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

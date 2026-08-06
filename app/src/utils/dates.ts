// Local-timezone date helpers.
//
// The whole app keys "today" off the DEVICE'S LOCAL calendar date. The
// trap is `Date.prototype.toISOString()`, which returns UTC — for any user
// whose timezone differs from UTC that silently mislabels the current day:
// the daily prompt would rotate at UTC midnight (not local), and a bloom
// sent late at night would be filed under the wrong day, so it reads as
// "not registered." Always use these helpers instead of slicing toISOString.

/** Device-local YYYY-MM-DD for the given date (default: now). */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's device-local YYYY-MM-DD. */
export const todayLocal = (): string => localDateString();

/** Device-local YYYY-MM-DD for `days` ago (default 1 = yesterday). */
export function daysAgoLocal(days = 1): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateString(d);
}

/** Device-local YYYY-MM-DD of an ISO timestamp ('' when empty/invalid).
 *  Use this instead of `iso.slice(0, 10)`, which yields the UTC day — an
 *  evening send west of UTC lands on "tomorrow", breaking Today labels
 *  and one-per-day dedup. */
export function localDayOf(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return localDateString(d);
}

/**
 * The device's IANA timezone name (e.g. "America/New_York"), or null if the
 * runtime can't resolve it. Pushed to the server via set_my_timezone so
 * profile_local_date stamps blooms/streaks on the user's real local day.
 */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

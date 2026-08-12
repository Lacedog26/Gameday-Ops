import type { AlertLevel, GameInfo, OpStatus, PregameEvent, TimedEvent } from '../types'

// ---------------------------------------------------------------------------
// Timezone: every wall-clock the board shows (current time, kickoff, each
// event's scheduled time) is rendered in US Eastern Time, and the kickoff
// input is interpreted as Eastern — so the board is correct on any TV/player
// regardless of that machine's own clock zone. Durations/countdowns are pure
// epoch math and are timezone-independent.
// ---------------------------------------------------------------------------
export const TEAM_TZ = 'America/New_York'

/** Extract wall-clock parts for an instant, evaluated in the team timezone. */
function partsInTZ(epochMs: number) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TEAM_TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p = dtf.formatToParts(new Date(epochMs)).reduce<Record<string, number>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = Number(part.value)
    return acc
  }, {})
  // Intl returns hour 24 for midnight in some engines; normalise to 0.
  if (p.hour === 24) p.hour = 0
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number }
}

/** Offset (ms) of the team timezone from UTC at a given instant (handles DST). */
function tzOffsetMs(epochMs: number): number {
  const p = partsInTZ(epochMs)
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUTC - epochMs
}

/**
 * Convert an Eastern-Time wall clock ("YYYY-MM-DDTHH:mm") to a UTC epoch.
 * Interpreting the kickoff field as Eastern keeps the board correct even if the
 * TV/admin device is set to another timezone.
 */
export function etWallTimeToEpoch(iso: string): number {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return new Date(iso).getTime()
  const [, y, mo, d, h, mi, s] = m
  const naiveUTC = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0)
  // Offset at the naive instant is a close-enough anchor for DST correctness.
  const offset = tzOffsetMs(naiveUTC)
  return naiveUTC - offset
}

/** Format an epoch as "YYYY-MM-DDTHH:mm" in Eastern Time (for the admin input). */
export function epochToEtWallISO(epochMs: number): string {
  const p = partsInTZ(epochMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

// Alert thresholds (seconds). Centralised so the whole app agrees on when a
// row escalates. Ordered from calm -> urgent.
export const THRESHOLDS = {
  warn: 5 * 60, // 5 minutes
  imminent: 2 * 60, // 2 minutes
  critical: 30, // 30 seconds
  goWindow: 20, // "GO NOW" stays lit for 20s, then the row completes and the
  // focus panel returns to the calm blue "next up" state
} as const

/** Pad a number to 2 digits. */
const p2 = (n: number) => String(Math.floor(n)).padStart(2, '0')

/**
 * Format a duration in seconds as HH:MM:SS (or MM:SS when under an hour is not
 * desired — we always show HH:MM:SS for the big kickoff clock for consistency).
 */
export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${p2(h)}:${p2(m)}:${p2(sec)}`
}

/** Format a duration as MM:SS (used for row/focus countdowns under an hour). */
export function formatMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${p2(m)}:${p2(sec)}`
}

/** Smartly pick MM:SS under an hour, HH:MM:SS at/above an hour. */
export function formatCountdown(totalSeconds: number): string {
  return totalSeconds >= 3600 ? formatHMS(totalSeconds) : formatMS(totalSeconds)
}

/**
 * Format the T-minus label from an offset in seconds, e.g.
 *  4620 -> "T-77", 2130 -> "T-35:30", 0 -> "T-0".
 */
export function formatTMinus(tMinusSeconds: number): string {
  if (tMinusSeconds <= 0) return 'T-0'
  const totalMin = Math.floor(tMinusSeconds / 60)
  const sec = tMinusSeconds % 60
  return sec === 0 ? `T-${totalMin}` : `T-${totalMin}:${p2(sec)}`
}

/** Parse a "T-minus" string (e.g. "77", "35:30", "T-44") back to seconds. */
export function parseTMinus(input: string): number | null {
  const cleaned = input.trim().replace(/^t-?/i, '')
  if (cleaned === '') return null
  const parts = cleaned.split(':')
  if (parts.some((x) => x === '' || Number.isNaN(Number(x)))) return null
  if (parts.length === 1) return Math.round(Number(parts[0]) * 60)
  if (parts.length === 2) return Math.round(Number(parts[0]) * 60 + Number(parts[1]))
  return null
}

/** Format an epoch-ms timestamp as an Eastern wall-clock, e.g. "11:45" / "1:00". */
export function formatClock(epochMs: number, withSeconds = false): string {
  const p = partsInTZ(epochMs)
  const ampm = p.hour >= 12 ? 'PM' : 'AM'
  let h = p.hour % 12
  if (h === 0) h = 12
  const base = withSeconds ? `${h}:${p2(p.minute)}:${p2(p.second)}` : `${h}:${p2(p.minute)}`
  return `${base} ${ampm}`
}

/** Compact Eastern clock (no AM/PM) mirroring the printed card, e.g. "12:26:30". */
export function formatCardClock(epochMs: number, tMinusSeconds: number): string {
  const p = partsInTZ(epochMs)
  let h = p.hour % 12
  if (h === 0) h = 12
  // Only show seconds when the offset itself carries seconds (matches source card).
  const showSeconds = tMinusSeconds % 60 !== 0
  return showSeconds ? `${h}:${p2(p.minute)}:${p2(p.second)}` : `${h}:${p2(p.minute)}`
}

/** Kickoff timestamp (ms) from game info, interpreting the field as Eastern. */
export function kickoffMs(game: GameInfo): number {
  return etWallTimeToEpoch(game.kickoffISO)
}

/** Absolute scheduled time (ms) for an event given kickoff. */
export function eventScheduledAt(kickoff: number, e: PregameEvent): number {
  return kickoff - e.tMinusSeconds * 1000
}

/**
 * Compute the alert level for an event.
 * `secondsUntil` may be negative (past). `acknowledged` short-circuits to done.
 */
export function computeLevel(secondsUntil: number, acknowledged: boolean): AlertLevel {
  if (acknowledged) return 'completed'
  if (secondsUntil <= -THRESHOLDS.goWindow) return 'completed'
  if (secondsUntil <= 0) return 'go'
  if (secondsUntil <= THRESHOLDS.critical) return 'critical'
  if (secondsUntil <= THRESHOLDS.imminent) return 'imminent'
  if (secondsUntil <= THRESHOLDS.warn) return 'warn'
  return 'upcoming'
}

/**
 * Enrich the active schedule with live timing for a given "now".
 * Sorted by scheduled time so board order always reflects the timeline.
 */
export function buildTimeline(
  events: PregameEvent[],
  game: GameInfo,
  nowMs: number,
): TimedEvent[] {
  const kickoff = kickoffMs(game)
  const timeline = events
    .map((event, index) => {
      const scheduledAt = eventScheduledAt(kickoff, event)
      const secondsUntil = (scheduledAt - nowMs) / 1000
      const acknowledged = Boolean(event.acknowledgedAt)
      return {
        event,
        index,
        scheduledAt,
        secondsUntil,
        level: computeLevel(secondsUntil, acknowledged),
        opStatus: 'upcoming' as OpStatus,
      }
    })
    .sort((a, b) => a.scheduledAt - b.scheduledAt)

  return annotateOpStatus(timeline)
}

/**
 * Assign each event its sequence position:
 *  - complete: already went out (past the GO window / acknowledged)
 *  - now: at/just after its scheduled time (GO window)
 *  - ondeck: the earliest not-yet-started event(s) — the next group to go
 *  - upcoming: everything after on-deck
 * Simultaneous events (same scheduled time) can share NOW or ON DECK.
 */
export function annotateOpStatus(timeline: TimedEvent[]): TimedEvent[] {
  const pending = timeline.filter((t) => t.level !== 'completed' && t.level !== 'go')
  const ondeckAt = pending.length ? Math.min(...pending.map((t) => t.scheduledAt)) : Infinity
  return timeline.map((t) => {
    let opStatus: OpStatus
    if (t.level === 'completed') opStatus = 'complete'
    else if (t.level === 'go') opStatus = 'now'
    else if (t.scheduledAt === ondeckAt) opStatus = 'ondeck'
    else opStatus = 'upcoming'
    return { ...t, opStatus }
  })
}

export interface TimelineFocus {
  timeline: TimedEvent[]
  /** The "NOW" card — next non-completed event about to go out. */
  now: TimedEvent | null
  /** The "NEXT" card — the event after `now`. */
  next: TimedEvent | null
  /** Index (into timeline) of the current event for the progress rail. */
  currentIndex: number
}

/**
 * From a timeline, derive the focus panel targets. "NOW" = the first event
 * that has not completed (i.e. the imminent group). "NEXT" = the one after.
 */
export function deriveFocus(timeline: TimedEvent[]): TimelineFocus {
  const firstActiveIdx = timeline.findIndex((t) => t.level !== 'completed')
  const now = firstActiveIdx >= 0 ? timeline[firstActiveIdx] : null
  const next =
    firstActiveIdx >= 0 && firstActiveIdx + 1 < timeline.length
      ? timeline[firstActiveIdx + 1]
      : null
  return {
    timeline,
    now,
    next,
    currentIndex: firstActiveIdx,
  }
}

/** The highest urgency present in a timeline — used to gate the culture panel. */
export function peakUrgency(timeline: TimedEvent[]): AlertLevel {
  const rank: Record<AlertLevel, number> = {
    completed: 0,
    upcoming: 1,
    warn: 2,
    imminent: 3,
    critical: 4,
    go: 5,
  }
  return timeline.reduce<AlertLevel>((peak, t) => {
    // Only "live" (non-completed) events contribute to urgency.
    return rank[t.level] > rank[peak] ? t.level : peak
  }, 'upcoming')
}

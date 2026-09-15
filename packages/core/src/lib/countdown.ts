// ---------------------------------------------------------------------------
// Pure decision logic for the audible final-seconds countdown (requirement #23).
//
// This module holds NO audio, timers, or React — just the math that decides,
// for a given tick, which countdown seconds should beep and whether the GO horn
// should fire. Keeping it pure makes it exhaustively unit-testable (the hook
// `useAlertSounds` wires it to WebAudio and the live timeline).
//
// The authoritative input is each event's `secondsUntil` (its scheduled
// timestamp minus the current clock). There is deliberately no independent
// timer here, so audio can never drift from the displayed countdown.
// ---------------------------------------------------------------------------

/** The final N seconds get an audible beep. T-0 is the GO horn, not a beep. */
export const FINAL_COUNTDOWN_SECONDS = 5

/** A scheduled group: events sharing a `scheduledAt` share one countdown. */
export interface CountdownGroup {
  /** Absolute scheduled time (ms). The dedup key for simultaneous events. */
  scheduledAt: number
  /** Seconds until the scheduled time (negative once past). */
  secondsUntil: number
}

/**
 * Per-group memory carried across ticks. `lastBeepSec` maps a group's
 * `scheduledAt` to the smallest second already beeped (so each second fires
 * once and never re-fires upward). `goFired` records groups whose GO horn has
 * already sounded this pass.
 */
export interface CountdownMemory {
  lastBeepSec: Map<number, number>
  goFired: Set<number>
}

/** What to sound this tick. Seconds/GO are each collapsed so nothing doubles. */
export interface CountdownSignal {
  /** Distinct countdown seconds to beep this tick (usually 0 or 1 entries). */
  beeps: number[]
  /** Whether to fire the GO transition horn this tick. */
  go: boolean
}

/** Fresh, empty countdown memory. */
export function createCountdownMemory(): CountdownMemory {
  return { lastBeepSec: new Map(), goFired: new Set() }
}

/**
 * Collapse a full timeline to one group per scheduled instant. Simultaneous
 * events (identical `scheduledAt`) become a single group → one countdown signal.
 */
export function groupByScheduledAt(
  timeline: { scheduledAt: number; secondsUntil: number }[],
): CountdownGroup[] {
  const byTime = new Map<number, number>()
  for (const t of timeline) {
    const prev = byTime.get(t.scheduledAt)
    // Defensive against float jitter across identical timestamps: keep smallest.
    if (prev === undefined || t.secondsUntil < prev) byTime.set(t.scheduledAt, t.secondsUntil)
  }
  return [...byTime].map(([scheduledAt, secondsUntil]) => ({ scheduledAt, secondsUntil }))
}

/**
 * Decide this tick's audible signals and update `mem` in place.
 *
 * Rules (all from requirement #23):
 *   • The active whole-second is `Math.ceil(secondsUntil)` — robust to timer
 *     delay, so a skipped render advances to the current second rather than
 *     replaying missed seconds late, and never beeps early.
 *   • Each group beeps a given second at most once (monotonic memory).
 *   • At/just past T-0 the GO horn fires once per group (never a 6th beep).
 *   • A group comfortably in the future again (kickoff edited) re-arms.
 *   • Distinct seconds/GO are de-duplicated across groups so coinciding events
 *     never double up.
 *   • `mem` for groups no longer present is pruned so it can't grow unbounded.
 */
export function nextCountdownSignal(groups: CountdownGroup[], mem: CountdownMemory): CountdownSignal {
  const present = new Set(groups.map((g) => g.scheduledAt))
  for (const key of [...mem.lastBeepSec.keys()]) if (!present.has(key)) mem.lastBeepSec.delete(key)
  for (const key of [...mem.goFired]) if (!present.has(key)) mem.goFired.delete(key)

  const beeps = new Set<number>()
  let go = false

  for (const { scheduledAt, secondsUntil: s } of groups) {
    // Re-arm once comfortably in the future again.
    if (s > FINAL_COUNTDOWN_SECONDS + 1) {
      mem.lastBeepSec.delete(scheduledAt)
      mem.goFired.delete(scheduledAt)
      continue
    }

    // GO transition at (or just past) T-0 — one horn per group, near the moment.
    if (s <= 0) {
      if (!mem.goFired.has(scheduledAt) && s > -3) {
        mem.goFired.add(scheduledAt)
        go = true
      }
      continue
    }

    // Countdown beep for the whole-second currently elapsing.
    const sec = Math.ceil(s)
    if (sec < 1 || sec > FINAL_COUNTDOWN_SECONDS) continue
    const last = mem.lastBeepSec.get(scheduledAt)
    if (last === undefined || sec < last) {
      mem.lastBeepSec.set(scheduledAt, sec)
      beeps.add(sec)
    }
  }

  return { beeps: [...beeps], go }
}

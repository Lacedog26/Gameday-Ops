import type { PregameEvent } from '../types'

// ---------------------------------------------------------------------------
// Dynamic T-minus ANCHOR system.
//
// A pre-game routine is a set of events, each with a `tMinusSeconds` (seconds
// before kickoff — full second precision, never rounded). The FIRST event (the
// one farthest from kickoff, i.e. the largest tMinusSeconds) is the routine's
// "anchor". The events keep their relative spacing; changing the anchor shifts
// the whole routine by the same delta while the terminal KICKOFF (T-0) stays
// pinned at 0.
//
//   Anchor T-77  →  77, 62, 50, 50
//   Anchor T-79  →  79, 64, 52, 52   (+2:00 to every non-kickoff event)
//   Anchor T-80  →  80, 65, 53, 53
//
// Seconds are preserved exactly (e.g. T-37:30 → T-38:30 when the anchor moves
// +1:00). Pure integer-second math — no rounding, no floats.
// ---------------------------------------------------------------------------

/** The routine's anchor in seconds (the largest tMinusSeconds), or 0 if empty. */
export function routineAnchorSeconds(events: PregameEvent[]): number {
  return events.reduce((max, e) => (e.tMinusSeconds > max ? e.tMinusSeconds : max), 0)
}

/**
 * Shift the whole routine so its anchor becomes `newAnchorSeconds`, preserving
 * every event's spacing (and seconds). The terminal kickoff (isKickoff or
 * tMinusSeconds === 0) stays at 0. Non-kickoff events never go below 1s.
 */
export function shiftRoutineToAnchor(events: PregameEvent[], newAnchorSeconds: number): PregameEvent[] {
  const anchor = routineAnchorSeconds(events)
  const delta = Math.round(newAnchorSeconds) - anchor
  if (delta === 0) return events.map((e) => ({ ...e }))
  return events.map((e) => {
    if (e.isKickoff || e.tMinusSeconds === 0) return { ...e }
    return { ...e, tMinusSeconds: Math.max(1, e.tMinusSeconds + delta) }
  })
}

/** Convenience: common routine anchor presets (seconds). */
export const ANCHOR_PRESETS: { label: string; seconds: number }[] = [
  { label: 'T-77', seconds: 77 * 60 },
  { label: 'T-79', seconds: 79 * 60 },
  { label: 'T-80', seconds: 80 * 60 },
]

import { useMemo } from 'react'
import { useDashboard } from '../context/DashboardContext'
import { buildTimeline, deriveFocus, kickoffMs, peakUrgency } from '../lib/time'
import type { AlertLevel, TimedEvent } from '../types'

export interface TimelineState {
  timeline: TimedEvent[]
  now: TimedEvent | null
  next: TimedEvent | null
  currentIndex: number
  /** Seconds until kickoff (>= 0 shown as countdown; negative = in-game). */
  secondsToKickoff: number
  kickoffAt: number
  peak: AlertLevel
}

/**
 * Central selector: turns the persisted schedule + a live `nowMs` into the
 * fully-derived board state every component reads from. Memoised per tick.
 */
export function useTimeline(nowMs: number): TimelineState {
  const { state } = useDashboard()
  const { activeEvents, game } = state

  return useMemo(() => {
    const timeline = buildTimeline(activeEvents, game, nowMs)
    const focus = deriveFocus(timeline)
    const kickoffAt = kickoffMs(game)
    const secondsToKickoff = (kickoffAt - nowMs) / 1000
    return {
      ...focus,
      secondsToKickoff,
      kickoffAt,
      peak: peakUrgency(timeline),
    }
  }, [activeEvents, game, nowMs])
}

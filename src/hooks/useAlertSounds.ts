import { useEffect, useRef } from 'react'
import type { AlertLevel, TimedEvent } from '../types'

// Synthesised alert tones via WebAudio — no audio files to ship or fail to load.
// Different cues for each escalation so staff recognise urgency without looking.

type Cue = 'warn' | 'imminent' | 'critical' | 'go'

const CUE_FOR_LEVEL: Partial<Record<AlertLevel, Cue>> = {
  warn: 'warn',
  imminent: 'imminent',
  critical: 'critical',
  go: 'go',
}

// Rank so we only fire a cue when an event ESCALATES (never on de-escalation).
const RANK: Record<AlertLevel, number> = {
  completed: 0,
  upcoming: 1,
  warn: 2,
  imminent: 3,
  critical: 4,
  go: 5,
}

interface Options {
  enabled: boolean
  volume: number
}

export function useAlertSounds(timeline: TimedEvent[], { enabled, volume }: Options): void {
  const ctxRef = useRef<AudioContext | null>(null)
  const lastLevel = useRef<Map<string, AlertLevel>>(new Map())
  const primed = useRef(false)

  // Lazily create + resume the AudioContext on the first user gesture (browsers
  // block autoplay audio until then). TV kiosks: a single click/keypress arms it.
  useEffect(() => {
    const prime = () => {
      if (primed.current) return
      try {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctxRef.current = new Ctor()
        ctxRef.current.resume().catch(() => {})
        primed.current = true
      } catch {
        /* WebAudio unavailable */
      }
    }
    window.addEventListener('pointerdown', prime)
    window.addEventListener('keydown', prime)
    return () => {
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('keydown', prime)
    }
  }, [])

  const play = (cue: Cue) => {
    const ctx = ctxRef.current
    if (!ctx || !enabled) return
    const now = ctx.currentTime
    // Each cue = a short sequence of tones (freq, startOffset, duration).
    const patterns: Record<Cue, Array<[number, number, number]>> = {
      warn: [[660, 0, 0.14]],
      imminent: [
        [740, 0, 0.12],
        [740, 0.2, 0.12],
      ],
      critical: [
        [880, 0, 0.1],
        [880, 0.16, 0.1],
        [880, 0.32, 0.1],
      ],
      go: [
        [523, 0, 0.14],
        [784, 0.14, 0.14],
        [1046, 0.28, 0.26],
      ],
    }
    for (const [freq, offset, dur] of patterns[cue]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = cue === 'go' ? 'sawtooth' : 'square'
      osc.frequency.value = freq
      const start = now + offset
      const vol = Math.max(0, Math.min(1, volume)) * 0.35
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(vol, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + dur + 0.02)
    }
  }

  useEffect(() => {
    if (!enabled) {
      // Keep levels current so re-enabling doesn't retro-fire a backlog.
      for (const t of timeline) lastLevel.current.set(t.event.id, t.level)
      return
    }
    for (const t of timeline) {
      const prev = lastLevel.current.get(t.event.id)
      lastLevel.current.set(t.event.id, t.level)
      if (prev === undefined) continue // first observation — don't fire
      if (RANK[t.level] > RANK[prev]) {
        const cue = CUE_FOR_LEVEL[t.level]
        if (cue) play(cue)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, enabled, volume])
}

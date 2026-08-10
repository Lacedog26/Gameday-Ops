import { useEffect, useRef } from 'react'
import type { TimedEvent } from '../types'

// ---------------------------------------------------------------------------
// Countdown alert tones (WebAudio — no audio files to ship or fail to load).
//
// For each group about to go out:
//   • 10 seconds left  -> one beep
//   • 5, 4, 3, 2       -> a beep each (rising urgency)
//   • 1 second left    -> one LOUD beep (meant to carry over TV speakers)
//   • 0 (GO NOW)       -> a rising "go" horn
// ---------------------------------------------------------------------------

interface Options {
  enabled: boolean
  volume: number
}

// Seconds-remaining marks that trigger a beep, largest first.
const MARKS = [10, 5, 4, 3, 2, 1] as const

export function useAlertSounds(timeline: TimedEvent[], { enabled, volume }: Options): void {
  const ctxRef = useRef<AudioContext | null>(null)
  const primed = useRef(false)
  // Per-event: the smallest countdown mark already beeped (so each fires once).
  const lastMark = useRef<Map<string, number>>(new Map())
  // Per-event: whether the GO tone has fired for this pass.
  const goFired = useRef<Set<string>>(new Set())

  // Arm the AudioContext on the first user interaction (browsers block audio
  // until then). On a TV kiosk, one click/keypress after load enables sound.
  useEffect(() => {
    const prime = () => {
      if (primed.current) return
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
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

  // Play a short tone. `loud` boosts gain + length for the final "1" and GO.
  const tone = (freq: number, when: number, dur: number, gain: number, type: OscillatorType) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, when)
    g.gain.linearRampToValueAtTime(gain, when + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(g).connect(ctx.destination)
    osc.start(when)
    osc.stop(when + dur + 0.02)
  }

  const vol = () => Math.max(0, Math.min(1, volume))

  const beepForMark = (mark: number) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    if (mark === 10) {
      tone(880, now, 0.16, vol() * 0.5, 'square')
    } else if (mark === 1) {
      // Really loud final beep — layered for punch over TV speakers.
      tone(1319, now, 0.55, Math.min(1, vol() * 1.0), 'sawtooth')
      tone(660, now, 0.55, Math.min(1, vol() * 0.7), 'square')
    } else {
      // 5, 4, 3, 2 — rising pitch as it gets closer.
      const freq = 900 + (5 - mark) * 60
      tone(freq, now, 0.13, vol() * 0.6, 'square')
    }
  }

  const playGo = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    tone(523, now, 0.16, vol() * 0.8, 'sawtooth')
    tone(784, now + 0.16, 0.16, vol() * 0.85, 'sawtooth')
    tone(1046, now + 0.32, 0.32, Math.min(1, vol() * 0.95), 'sawtooth')
  }

  useEffect(() => {
    if (!enabled || !ctxRef.current) return

    for (const t of timeline) {
      const id = t.event.id
      const s = t.secondsUntil

      // Reset a group's countdown state once it's comfortably in the future
      // again (e.g. kickoff time was edited), so it can beep on a fresh pass.
      if (s > 11) {
        if (lastMark.current.has(id)) lastMark.current.delete(id)
        goFired.current.delete(id)
        continue
      }

      // GO tone at (or just past) the scheduled moment.
      if (s <= 0) {
        if (!goFired.current.has(id) && s > -3) {
          goFired.current.add(id)
          playGo()
        }
        continue
      }

      // Countdown beeps: fire the largest not-yet-fired mark at/under `s`.
      const already = lastMark.current.get(id) ?? Infinity
      const due = MARKS.find((m) => s <= m && m < already)
      if (due !== undefined) {
        lastMark.current.set(id, due)
        beepForMark(due)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, enabled, volume])
}

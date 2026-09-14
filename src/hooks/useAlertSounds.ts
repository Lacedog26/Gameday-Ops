import { useEffect, useRef } from 'react'
import type { TimedEvent } from '../types'
import {
  FINAL_COUNTDOWN_SECONDS as FINAL,
  createCountdownMemory,
  groupByScheduledAt,
  nextCountdownSignal,
} from '../lib/countdown'

// ---------------------------------------------------------------------------
// Audible final-seconds countdown (WebAudio — no audio files to ship or fail
// to load). For each event about to go out:
//
//   T-0:05, 0:04, 0:03, 0:02, 0:01  -> one short, clean beep per second
//   T-0:00                          -> the GO/event transition horn (not a beep)
//
// Design guarantees (see requirement #23):
//   • Driven from the SAME authoritative countdown the board displays — the
//     `secondsUntil` derived from the event's scheduled timestamp and the live
//     clock. There is NO separate setInterval that could drift from the screen.
//   • The active whole-second is `Math.ceil(secondsUntil)`, so a delayed or
//     skipped render never beeps early and never beeps the wrong second.
//   • Each event beeps at most once per second (monotonic per-event memory), so
//     a double render in the same second cannot double-beep.
//   • Simultaneous events (identical scheduled time) collapse to ONE signal —
//     and any two beeps that would land on the same second in the same tick are
//     played once — so overlapping events never create double-beep chaos.
//   • Nothing beeps once the event reaches 0; the countdown only re-arms if the
//     event becomes genuinely future again (e.g. kickoff was edited). A refresh
//     on a past event stays silent.
// ---------------------------------------------------------------------------

interface Options {
  enabled: boolean
  volume: number
}

export function useAlertSounds(timeline: TimedEvent[], { enabled, volume }: Options): void {
  const ctxRef = useRef<AudioContext | null>(null)
  const primed = useRef(false)
  // Countdown memory (kept across ticks). Simultaneous events share a group,
  // and each group's second fires once — the pure logic lives in lib/countdown.
  const memRef = useRef(createCountdownMemory())

  // Arm the AudioContext on the first user interaction (browsers block audio
  // until then). On a TV kiosk, one click/keypress after load enables sound —
  // clicking the Sound control or the board both count. We do NOT try to
  // bypass the autoplay policy; we simply unlock on a legitimate gesture.
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

  // Play a short tone at the given frequency, starting now on the audio clock.
  const tone = (freq: number, dur: number, gain: number, type: OscillatorType) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const when = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, when)
    g.gain.linearRampToValueAtTime(gain, when + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(g).connect(ctx.destination)
    osc.start(when)
    osc.stop(when + dur + 0.02)
  }

  const vol = () => Math.max(0, Math.min(1, volume))

  // One short, clean, professional beep for a given countdown second. The pitch
  // rises slightly as it approaches 0; the final "1" is a touch longer/louder
  // so it carries over TV speakers — but it stays a short tone, not an alarm.
  const beep = (sec: number) => {
    if (sec === 1) {
      tone(1175, 0.2, Math.min(1, vol() * 0.9), 'triangle')
    } else {
      const freq = 760 + (FINAL - sec) * 70 // 5:760 4:830 3:900 2:970
      tone(freq, 0.11, vol() * 0.6, 'triangle')
    }
  }

  // The GO transition horn (a rising three-note flourish — distinct from the
  // countdown beeps so operators can tell "send them" from the count).
  const playGo = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    const note = (freq: number, at: number, dur: number, gain: number) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(gain, at + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      osc.connect(g).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + dur + 0.02)
    }
    note(523, now, 0.16, vol() * 0.8)
    note(784, now + 0.16, 0.16, vol() * 0.85)
    note(1046, now + 0.32, 0.32, Math.min(1, vol() * 0.95))
  }

  useEffect(() => {
    if (!enabled) return
    const ctx = ctxRef.current
    if (!ctx) return
    // A context can lapse to "suspended" (tab backgrounded); nudge it back so
    // the beep is audible when the board returns to the foreground.
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})

    // The pure decision: group simultaneous events, then resolve this tick's
    // beeps + GO from the authoritative secondsUntil (no independent timer).
    const { beeps, go } = nextCountdownSignal(groupByScheduledAt(timeline), memRef.current)
    for (const sec of beeps) beep(sec)
    if (go) playGo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, enabled, volume])
}

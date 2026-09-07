import { useEffect, useState } from 'react'

/**
 * Returns the current epoch time in ms, re-rendering on a fixed interval.
 * Uses a self-correcting timeout aligned to the next tick boundary so the
 * clock/countdowns don't drift and update crisply on the second.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let timer: number
    const schedule = () => {
      const current = Date.now()
      // Align to the next interval boundary (e.g. next whole second).
      const delay = intervalMs - (current % intervalMs)
      timer = window.setTimeout(() => {
        setNow(Date.now())
        schedule()
      }, delay)
    }
    schedule()

    // Snap immediately when the tab/TV regains focus after sleep.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])

  return now
}

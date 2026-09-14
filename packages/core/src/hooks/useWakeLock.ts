import { useEffect } from 'react'

/**
 * Keeps the TV screen awake via the Screen Wake Lock API while `enabled`.
 * Silently no-ops on browsers without support. Re-acquires the lock after the
 * tab is backgrounded and returns (locks are released on visibility loss).
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any
    if (!nav.wakeLock?.request) return

    let sentinel: { release: () => Promise<void> } | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        sentinel = await nav.wakeLock.request('screen')
      } catch {
        /* denied or unavailable — ignore */
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      sentinel?.release().catch(() => {})
    }
  }, [enabled])
}

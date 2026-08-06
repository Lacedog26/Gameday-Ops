import { useCallback, useEffect, useState } from 'react'
import {
  getStreakFreezeStatus,
  useStreakFreeze as useStreakFreezeRpc,
  type StreakFreezeStatus,
} from '../lib/supabase'

/**
 * Reads / consumes the rolling-7-day streak freeze. Pro-only on the
 * server, but the hook itself is happy to run for free users —
 * `useFreeze()` will surface `pro_required` and the UI can show an
 * upsell. Returns `null` for `status` if the underlying RPC isn't
 * deployed yet; the freeze pill on Landing collapses in that case
 * so the page stays clean before the migration is applied.
 */
export function useStreakFreezeStatus(enabled: boolean) {
  const [status, setStatus] = useState<StreakFreezeStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      setStatus(await getStreakFreezeStatus())
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) refresh()
  }, [enabled, refresh])

  const useFreeze = useCallback(async () => {
    const result = await useStreakFreezeRpc()
    if (result.ok) await refresh()
    return result
  }, [refresh])

  return { status, loading, refresh, useFreeze }
}

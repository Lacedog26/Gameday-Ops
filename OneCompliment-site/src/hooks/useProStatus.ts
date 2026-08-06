import { useCallback, useEffect, useState } from 'react'
import { loadProStatus } from '../lib/supabase'

/**
 * Polls profiles.is_pro at mount + on demand. Until a Stripe-webhook→DB
 * pipeline is in place this just returns false — but UI that depends on
 * it will start lighting up automatically the moment the column is wired.
 */
export function useProStatus(enabled: boolean) {
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      setIsPro(await loadProStatus())
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) refresh()
  }, [enabled, refresh])

  return { isPro, loading, refresh }
}

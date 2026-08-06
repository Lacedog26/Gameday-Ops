import { useCallback, useEffect, useState } from 'react'
import { loadMyGroups, type GroupInfo } from '../lib/groups'

/**
 * Tracks the current user's groups. Reload it after create/join/leave;
 * the Home submit flow also reloads so the bottom-nav badge stays current.
 */
export function useGroups(enabled: boolean) {
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      setGroups(await loadMyGroups())
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) refresh()
  }, [enabled, refresh])

  return { groups, loading, refresh }
}

import { useCallback, useEffect, useState } from 'react'
import { loadMyTeams, type Team } from '../lib/teams'

export function useTeams(enabled: boolean) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      setTeams(await loadMyTeams())
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) refresh()
  }, [enabled, refresh])

  return { teams, loading, refresh }
}

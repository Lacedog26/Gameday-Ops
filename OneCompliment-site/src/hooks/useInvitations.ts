import { useCallback, useEffect, useState } from 'react'
import { loadMyInvitations, type Invitation } from '../lib/invitations'

/**
 * Pulls the user's pending invitations. Filterable by entity_type so
 * the Teams list and Groups list each only see their own — same split
 * mobile uses on TeamsListScreen / GroupsScreen.
 */
export function useInvitations(enabled: boolean) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      setInvitations(await loadMyInvitations())
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) refresh()
  }, [enabled, refresh])

  const teamInvites = invitations.filter((i) => i.entity_type === 'team' && i.status === 'pending')
  const groupInvites = invitations.filter((i) => i.entity_type === 'group' && i.status === 'pending')

  return { invitations, teamInvites, groupInvites, loading, refresh }
}

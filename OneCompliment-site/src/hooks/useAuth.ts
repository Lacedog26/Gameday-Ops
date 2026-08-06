import { useCallback, useEffect, useState } from 'react'
import {
  ensureSession,
  loadProfile,
  claimUsername as claimUsernameRpc,
  syncTimezone,
  supabase,
  type Profile,
} from '../lib/supabase'

type AuthState = {
  userId: string | null
  username: string | null
  email: string | null
  isAnonymous: boolean
  loading: boolean
}

/**
 * One-shot session bootstrap + profile load.
 * Listens for auth state changes (e.g. after OTP verify) and reloads
 * the profile so the rest of the app sees the new identity.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    userId: null,
    username: null,
    email: null,
    isAnonymous: true,
    loading: true,
  })

  const refresh = useCallback(async () => {
    const userId = await ensureSession()
    // Fire-and-forget: keep the profile's timezone current so server-side
    // streak rollover uses the user's local day. Never blocks the bootstrap.
    void syncTimezone()
    const profile: Profile = await loadProfile()
    const { data } = await supabase.auth.getSession()
    const isAnon = data.session?.user.is_anonymous ?? true
    setState({
      userId,
      username: profile.username,
      email: profile.email,
      isAnonymous: Boolean(isAnon),
      loading: false,
    })
  }, [])

  useEffect(() => {
    refresh()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh()
    })
    return () => sub.subscription.unsubscribe()
  }, [refresh])

  const claimUsername = useCallback(
    async (username: string) => {
      const result = await claimUsernameRpc(username)
      if (result.ok) await refresh()
      return result
    },
    [refresh],
  )

  return { ...state, refresh, claimUsername }
}

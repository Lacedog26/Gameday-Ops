import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseConfig'

// ---------------------------------------------------------------------------
// Supabase Auth (email/password) for the commercial product. The board and TV
// display stay PUBLIC; only the admin/billing routes are gated (and only when
// VITE_REQUIRE_AUTH is on — see RequireAuth). Session persists across reloads.
// ---------------------------------------------------------------------------

export interface AuthValue {
  user: User | null
  session: Session | null
  loading: boolean
  /** True when a Supabase backend is configured (so auth is possible). */
  authAvailable: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirm?: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const authAvailable = Boolean(supabase)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthValue = {
    user: session?.user ?? null,
    session,
    loading,
    authAvailable,
    async signIn(email, password) {
      if (!supabase) return { error: 'Backend not configured.' }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message }
    },
    async signUp(email, password) {
      if (!supabase) return { error: 'Backend not configured.' }
      const { data, error } = await supabase.auth.signUp({ email, password })
      return { error: error?.message, needsConfirm: !error && !data.session }
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
    },
    async resetPassword(email) {
      if (!supabase) return { error: 'Backend not configured.' }
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      return { error: error?.message }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

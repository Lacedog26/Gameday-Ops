import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseConfig'
import { siteUrl } from '../product'

// ---------------------------------------------------------------------------
// Supabase Auth (email/password) for the commercial product. In commercial mode
// the app routes are gated by RequireAuth/RequireEntitlement; the TV display is
// reached via a per-display token (no login). Session persists across reloads.
//
// All auth emails (confirmation, password reset) redirect back to the product's
// canonical production origin (product.publicSiteUrl) so links never point at
// localhost (H2). Password recovery is captured here and surfaced to the UI.
// ---------------------------------------------------------------------------

export interface AuthValue {
  user: User | null
  session: Session | null
  loading: boolean
  /** True when a Supabase backend is configured (so auth is possible). */
  authAvailable: boolean
  /** True after a password-reset link is opened, until a new password is set. */
  recovery: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirm?: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string }>
  updatePassword: (password: string) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthValue | null>(null)

/** Where Supabase should send the user back after an email link. */
function redirectBase(): string {
  const base = siteUrl()
  return base || (typeof window !== 'undefined' ? window.location.origin : '')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)
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
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthValue = {
    user: session?.user ?? null,
    session,
    loading,
    authAvailable,
    recovery,
    async signIn(email, password) {
      if (!supabase) return { error: 'Backend not configured.' }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message }
    },
    async signUp(email, password) {
      if (!supabase) return { error: 'Backend not configured.' }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectBase() },
      })
      return { error: error?.message, needsConfirm: !error && !data.session }
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
    },
    async resetPassword(email) {
      if (!supabase) return { error: 'Backend not configured.' }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectBase(),
      })
      return { error: error?.message }
    },
    async updatePassword(password) {
      if (!supabase) return { error: 'Backend not configured.' }
      const { error } = await supabase.auth.updateUser({ password })
      if (!error) setRecovery(false)
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

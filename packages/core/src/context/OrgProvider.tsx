import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseConfig'
import { setActiveOrg } from '../lib/session'
import { productConfig } from '../product'
import { useAuth } from './AuthProvider'
import type { Subscription, SubscriptionStatus } from '../billing'

// ---------------------------------------------------------------------------
// Organization + subscription resolver. After a user signs in, this calls the
// `bootstrap_org` RPC (creates the org + admin membership on first login, or
// returns the existing one), loads the org + its subscription, and flips the
// board scope to that org so every edit saves to the org's own, RLS-isolated
// board. On sign-out it clears the scope back to the public/demo board.
//
// Inert without a backend or a signed-in user, so the un-gated demo and NFL are
// unaffected: they simply keep using the public board.
// ---------------------------------------------------------------------------

export interface Org {
  id: string
  name: string
  productType?: string
}

export interface OrgValue {
  org: Org | null
  subscription: Subscription | null
  /** The caller's role in the org ('admin' | 'operator' | 'viewer'). */
  role: string | null
  loading: boolean
  /** Re-fetch the org + subscription (e.g. after returning from checkout). */
  refresh: () => Promise<void>
}

const OrgContext = createContext<OrgValue | null>(null)

/** The DB product_type for this build (drives org creation + entitlement). */
function productArg(): 'NFL' | 'COLLEGE_FOOTBALL' {
  try {
    return productConfig().storageNamespace === 'college' ? 'COLLEGE_FOOTBALL' : 'NFL'
  } catch {
    return 'COLLEGE_FOOTBALL'
  }
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [org, setOrg] = useState<Org | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function resolve(userId: string) {
    if (!supabase) return
    setLoading(true)
    try {
      const { data: orgId, error } = await supabase.rpc('bootstrap_org', { product: productArg() })
      if (error || !orgId) {
        console.warn('[org] bootstrap failed', error)
        return
      }
      const id = orgId as string

      const [{ data: orgRow }, { data: subRow }, { data: memRow }] = await Promise.all([
        supabase.from('organizations').select('id,name,product_type').eq('id', id).maybeSingle(),
        supabase
          .from('subscriptions')
          .select('status,billing_interval,trial_ends_at,current_period_end,stripe_customer_id,stripe_subscription_id')
          .eq('org_id', id)
          .maybeSingle(),
        supabase.from('memberships').select('role').eq('org_id', id).eq('user_id', userId).maybeSingle(),
      ])

      setOrg(
        orgRow
          ? { id: orgRow.id as string, name: orgRow.name as string, productType: orgRow.product_type as string }
          : { id, name: 'My Program' },
      )
      setRole((memRow?.role as string) ?? null)
      setSubscription(
        subRow
          ? {
              status: subRow.status as SubscriptionStatus,
              interval: (subRow.billing_interval as Subscription['interval']) ?? undefined,
              trialEndsAt: (subRow.trial_ends_at as string) ?? undefined,
              currentPeriodEnd: (subRow.current_period_end as string) ?? undefined,
              stripeCustomerId: (subRow.stripe_customer_id as string) ?? undefined,
              stripeSubscriptionId: (subRow.stripe_subscription_id as string) ?? undefined,
            }
          : null,
      )
      // Flip the board scope AFTER we know the org, so the dashboard reloads the
      // org's board rather than the public demo.
      setActiveOrg(id)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    if (!user || !supabase) {
      setOrg(null)
      setSubscription(null)
      setRole(null)
      setActiveOrg(null)
      return
    }
    resolve(user.id).catch((e) => !cancelled && console.warn('[org] resolve error', e))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const value: OrgValue = {
    org,
    subscription,
    role,
    loading,
    refresh: async () => {
      if (user) await resolve(user.id)
    },
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrg(): OrgValue {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider')
  return ctx
}

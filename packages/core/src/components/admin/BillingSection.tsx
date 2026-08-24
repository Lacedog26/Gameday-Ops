import { useState } from 'react'
import { PLAN, trialDaysRemaining, type BillingInterval, type Subscription } from '../../billing'
import { useOrg } from '../../context/OrgProvider'
import { supabase } from '../../lib/supabaseConfig'
import { Section, Button } from './ui'

/**
 * Billing — one simple plan: $5.99/mo or $60/yr, 14-day free trial.
 *
 * Reads the org's REAL subscription (seeded as a 14-day trial when the account
 * is created). "Start Subscription" calls the `create-checkout` edge function
 * and redirects to Stripe Checkout — it goes live the moment Stripe is wired
 * (keys in function secrets); until then it surfaces a clear message. No secret
 * keys ever touch the client.
 */
/**
 * Pull the real reason out of a failed edge-function call: prefer the JSON
 * {error} the function returns; fall back to the FunctionsHttpError body, then
 * its message. So the admin sees "No such price" / "Invalid API Key" etc.
 * instead of a misleading "Stripe is not connected".
 */
async function errorDetail(error: unknown, data: unknown): Promise<string> {
  const fromData = (data as { error?: string } | null)?.error
  if (fromData) return fromData
  const ctx = (error as { context?: Response } | null)?.context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json()
      if (body?.error) return body.error as string
    } catch {
      /* not JSON */
    }
  }
  return error instanceof Error ? error.message : 'Stripe not reachable — check the function logs.'
}

export default function BillingSection() {
  const { org, subscription } = useOrg()
  const [busy, setBusy] = useState<BillingInterval | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Real subscription when signed in; a local trial placeholder for the demo.
  const sub: Subscription = subscription ?? {
    status: 'trialing',
    trialEndsAt: new Date(Date.now() + PLAN.trialDays * 86_400_000).toISOString(),
  }
  const daysLeft = trialDaysRemaining(sub.trialEndsAt)
  const statusLabel =
    sub.status === 'trialing' ? 'Free trial' : sub.status.charAt(0).toUpperCase() + sub.status.slice(1)
  const nextBilling = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString()
    : sub.status === 'trialing' && sub.trialEndsAt
      ? `Trial ends ${new Date(sub.trialEndsAt).toLocaleDateString()}`
      : '—'

  async function startCheckout(interval: BillingInterval) {
    setMsg(null)
    if (!supabase || !org) {
      setMsg('Sign in to start a subscription.')
      return
    }
    setBusy(interval)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { interval, orgId: org.id, returnUrl: window.location.origin },
      })
      const url = (data as { url?: string } | null)?.url
      if (url) {
        window.location.href = url
        return
      }
      setMsg(`Couldn't start checkout: ${await errorDetail(error, data)}`)
    } catch (e) {
      setMsg(`Couldn't start checkout: ${e instanceof Error ? e.message : 'unexpected error'}`)
    } finally {
      setBusy(null)
    }
  }

  async function openPortal() {
    setMsg(null)
    if (!supabase || !org) return
    setPortalBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', { body: { orgId: org.id } })
      if (error) throw error
      const url = (data as { url?: string; error?: string } | null)?.url
      if (url) { window.location.href = url; return }
      setMsg(`Couldn't open billing: ${await errorDetail(error, data)}`)
    } catch (e) {
      setMsg(`Couldn't open billing: ${e instanceof Error ? e.message : 'unexpected error'}`)
    } finally {
      setPortalBusy(false)
    }
  }

  const isSubscribed = Boolean(sub.stripeCustomerId) || sub.status === 'active' || sub.status === 'past_due'

  return (
    <Section title="Billing & Subscription" subtitle={`${PLAN.name} — simple pricing, ${PLAN.trialDays}-day free trial`}>
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 rounded-xl border border-white/10 bg-navy-950/50 p-4 sm:grid-cols-4">
          <Summary label="Account" value={org?.name ?? 'Demo (not signed in)'} />
          <Summary label="Status" value={statusLabel} />
          <Summary label="Trial Days Left" value={sub.status === 'trialing' ? `${daysLeft}` : '—'} />
          <Summary label="Next Billing" value={nextBilling} />
        </div>

        {isSubscribed && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/5 px-4 py-3">
            <span className="text-sm text-slate-300">
              {sub.status === 'past_due'
                ? '⚠ Payment action required — update your card to keep access.'
                : 'Your subscription is active. Manage payment, plan, invoices, or cancel anytime.'}
            </span>
            <Button variant="ghost" onClick={openPortal} disabled={portalBusy}>
              {portalBusy ? 'Opening…' : 'Manage Billing'}
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <PriceCard
            title="Monthly"
            price={`$${PLAN.monthlyUsd}`}
            unit="/month"
            busy={busy === 'monthly'}
            onStart={() => startCheckout('monthly')}
          />
          <PriceCard
            title="Annual"
            price={`$${PLAN.annualUsd}`}
            unit="/year"
            best
            busy={busy === 'annual'}
            onStart={() => startCheckout('annual')}
          />
        </div>

        <ul className="grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
          {PLAN.features.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>

        {msg && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            {msg}
          </p>
        )}

        <p className="border-t border-white/10 pt-4 text-xs text-slate-500">
          Your trial is live. Subscribing redirects to secure Stripe Checkout — no card details touch this app,
          and no secret keys are ever stored in the client or the repo.
        </p>
      </div>
    </Section>
  )
}

function PriceCard({
  title,
  price,
  unit,
  best,
  busy,
  onStart,
}: {
  title: string
  price: string
  unit: string
  best?: boolean
  busy?: boolean
  onStart: () => void
}) {
  return (
    <div className={`rounded-2xl border p-5 ${best ? 'border-team-primary bg-team-primary/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="flex items-center justify-between">
        <span className="font-display text-lg font-extrabold uppercase tracking-wide">{title}</span>
        {best && <span className="rounded-full bg-team-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Best value</span>}
      </div>
      <div className="mt-2 text-3xl font-bold">
        {price}
        <span className="text-sm font-normal text-slate-400">{unit}</span>
      </div>
      <Button className="mt-4 w-full" onClick={onStart} disabled={busy}>
        {busy ? 'Starting…' : 'Start Subscription'}
      </Button>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-0.5 font-display text-lg font-bold">{value}</div>
    </div>
  )
}

import { PLAN, trialDaysRemaining, type Subscription } from '../../billing'
import { Section, Button } from './ui'

/**
 * Billing — one simple plan (Stripe-ready, not yet connected). $5.99/mo or
 * $59.99/yr with a 14-day free trial. Actions activate once Stripe + the backend
 * are wired. Until then this reflects a local trial placeholder.
 */
export default function BillingSection() {
  // Placeholder trial until auth + backend provide the real subscription.
  const sub: Subscription = {
    status: 'trialing',
    trialEndsAt: new Date(Date.now() + PLAN.trialDays * 86_400_000).toISOString(),
  }
  const daysLeft = trialDaysRemaining(sub.trialEndsAt)

  return (
    <Section title="Billing & Subscription" subtitle="GameDayOps College — simple pricing, 14-day free trial">
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 rounded-xl border border-white/10 bg-navy-950/50 p-4 sm:grid-cols-4">
          <Summary label="Plan" value="GameDayOps College" />
          <Summary label="Status" value={sub.status === 'trialing' ? 'Free trial' : sub.status} />
          <Summary label="Trial Days Left" value={`${daysLeft}`} />
          <Summary label="Next Billing" value="—" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PriceCard title="Monthly" price={`$${PLAN.monthlyUsd}`} unit="/month" />
          <PriceCard title="Annual" price={`$${PLAN.annualUsd}`} unit="/year" best />
        </div>

        <ul className="grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
          {PLAN.features.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-slate-500">
            Checkout, Manage &amp; Cancel activate once Stripe is connected (backend phase). Prices are configured
            in <code>billing.ts</code> and Stripe env vars — never hard-coded in the UI.
          </p>
          <div className="flex gap-2">
            <Button disabled>Start Subscription</Button>
            <Button variant="ghost" disabled>Manage</Button>
            <Button variant="ghost" disabled>Cancel</Button>
          </div>
        </div>
      </div>
    </Section>
  )
}

function PriceCard({ title, price, unit, best }: { title: string; price: string; unit: string; best?: boolean }) {
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

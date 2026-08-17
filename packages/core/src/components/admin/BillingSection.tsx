import { PLANS, type PlanId } from '../../billing'
import { Section, Button } from './ui'

/**
 * Billing — commercial plan structure (Stripe-ready, not yet connected). This is
 * the customer-facing shell described in the product spec: current plan, status,
 * limits, and upgrade/manage actions. Actions are disabled until the backend +
 * Stripe are wired in the Track B phase. Prices are configurable in billing.ts,
 * never hard-coded into the UI.
 */
export default function BillingSection() {
  // Placeholder current subscription until auth + backend provide the real one.
  const current: { plan: PlanId; status: string } = { plan: 'free', status: 'Demo' }

  return (
    <Section title="Billing & Plan" subtitle="Commercial plans — connect billing to enable checkout">
      <div className="flex flex-col gap-5">
        {/* Current plan summary */}
        <div className="grid gap-3 rounded-xl border border-white/10 bg-navy-950/50 p-4 sm:grid-cols-4">
          <Summary label="Current Plan" value={PLANS.find((p) => p.id === current.plan)?.name ?? '—'} />
          <Summary label="Status" value={current.status} />
          <Summary label="Displays" value="1 in use" />
          <Summary label="Next Billing" value="—" />
        </div>

        {/* Plan catalog */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`flex flex-col rounded-2xl border p-5 ${
                p.id === current.plan ? 'border-team-primary bg-team-primary/10' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="font-display text-lg font-extrabold uppercase tracking-wide">{p.name}</div>
              <div className="mt-1 text-2xl font-bold">
                {p.priceUsdMonthly === null ? 'Custom' : p.priceUsdMonthly === 0 ? 'Free' : `$${p.priceUsdMonthly}`}
                {p.priceUsdMonthly ? <span className="text-sm font-normal text-slate-400">/mo</span> : null}
              </div>
              <p className="mt-1 text-xs text-slate-400">{p.tagline}</p>
              <ul className="mt-3 flex-1 space-y-1 text-xs text-slate-300">
                {p.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
                <li className="text-slate-500">
                  {p.maxDisplays === null ? 'Unlimited displays' : `${p.maxDisplays} displays`} ·{' '}
                  {p.maxUsers === null ? 'Unlimited users' : `${p.maxUsers} users`}
                </li>
              </ul>
              <Button className="mt-4 w-full opacity-60" disabled>
                {p.id === current.plan ? 'Current' : p.priceUsdMonthly === null ? 'Contact Sales' : 'Upgrade'}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-slate-500">
            Billing actions (Upgrade / Downgrade / Cancel / Manage) activate once Stripe is connected in the
            backend phase. Prices here are defaults — configure them in <code>billing.ts</code>.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" disabled>Manage Billing</Button>
            <Button variant="ghost" disabled>Cancel</Button>
          </div>
        </div>
      </div>
    </Section>
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

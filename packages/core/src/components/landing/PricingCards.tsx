import { PLAN, ANNUAL_SAVINGS_USD } from '../../billing'

/** The two-plan pricing grid, shared by the landing page and /pricing. */
export default function PricingCards() {
  const annualPerMonth = Math.round((PLAN.annualUsd / 12) * 100) / 100
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="text-sm font-bold uppercase tracking-widest text-slate-400">Monthly</div>
        <div className="mt-2 text-5xl font-extrabold">
          ${PLAN.monthlyUsd}
          <span className="text-lg font-normal text-slate-400">/mo</span>
        </div>
        <div className="mt-2 text-sm text-slate-400">Billed monthly. Cancel anytime.</div>
      </div>
      <div className="relative rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-8 text-center">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-navy-950">
          Best value
        </div>
        <div className="text-sm font-bold uppercase tracking-widest text-emerald-300">Annual</div>
        <div className="mt-2 text-5xl font-extrabold">
          ${PLAN.annualUsd}
          <span className="text-lg font-normal text-slate-400">/yr</span>
        </div>
        <div className="mt-2 text-sm text-emerald-200">
          ≈ ${annualPerMonth}/mo — save about ${ANNUAL_SAVINGS_USD}/year
        </div>
      </div>
    </div>
  )
}

/** The included-features list (shared). */
export function PlanFeatures() {
  return (
    <ul className="mx-auto grid max-w-2xl gap-2 sm:grid-cols-2">
      {PLAN.features.map((f) => (
        <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-emerald-400">✓</span>
          {f}
        </li>
      ))}
    </ul>
  )
}

import { Link } from 'react-router-dom'
import { productConfig } from '../../product'
import { PLAN, TRIAL_POLICY } from '../../billing'
import { usePageTitle } from '../../hooks/usePageTitle'
import PricingCards, { PlanFeatures } from './PricingCards'
import Faq from './Faq'
import SiteFooter from './SiteFooter'

/** Public pricing page (Part 32). Same plan data as the landing page. */
export default function PricingPage() {
  let product = 'GameDayOps College'
  try {
    product = productConfig().productName
  } catch {
    /* not configured in isolation */
  }
  usePageTitle(`${product} — Pricing`)

  return (
    <div className="min-h-full w-full overflow-y-auto bg-[#05070f] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070f]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/welcome" className="font-display text-xl font-extrabold uppercase tracking-wide sm:text-2xl">{product}</Link>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white">Sign in</Link>
            <Link to="/signup" className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold tracking-wide text-navy-950 hover:bg-emerald-400">
              Start Free Trial
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-center font-display text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">One simple price</h1>
        <p className="mt-3 text-center text-slate-400">Everything included. No tiers, no add-ons. Cancel anytime.</p>

        <div className="mt-10">
          <PricingCards />
        </div>
        <p className="mt-5 text-center text-sm text-slate-400">{TRIAL_POLICY.sentence}</p>

        <div className="mt-6 text-center">
          <Link to="/signup" className="rounded-full bg-emerald-500 px-8 py-3 font-extrabold uppercase tracking-wide text-navy-950 hover:bg-emerald-400">
            Start Your {PLAN.trialDays}-Day Free Trial
          </Link>
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="mb-6 text-center font-display text-xl font-extrabold uppercase tracking-wide">Everything included</h2>
          <PlanFeatures />
        </div>

        <div className="mt-14">
          <h2 className="mb-6 text-center font-display text-2xl font-extrabold uppercase tracking-tight">Frequently asked</h2>
          <Faq />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

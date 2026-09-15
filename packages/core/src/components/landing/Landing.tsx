import { Link } from 'react-router-dom'
import { productConfig } from '../../product'
import { PLAN, TRIAL_POLICY } from '../../billing'
import { usePageTitle } from '../../hooks/usePageTitle'
import BoardPreview, { TimelinePreview, SchedulePreview } from './BoardPreview'
import PricingCards from './PricingCards'
import Faq from './Faq'
import ContactForm from './ContactForm'
import SiteFooter from './SiteFooter'

// Public marketing page. Product-branded (neutral), never team-branded, exposes
// no customer data. Every claim here reflects what the product actually does.
export default function Landing() {
  const product = safeName()
  usePageTitle(product)

  const features: { title: string; body: string }[] = [
    { title: 'Live Game-Day Countdown', body: 'One kickoff time drives every clock on every screen — always in sync.' },
    { title: 'Position / Group Timing', body: 'Specialists, QBs, offense, defense — each group knows exactly when to hit the field.' },
    { title: 'Automated Alerts', body: '5-minute, 2-minute, 30-second, and GO NOW escalations no one can miss.' },
    { title: 'Editable Pre-Game Templates', body: 'Build and reuse home and road pre-game routines — change anything, no developer needed.' },
    { title: 'Multiple TV Displays', body: 'Open a secure display link on any TV in the building; each one stays in sync with your board.' },
    { title: 'Team Branding', body: 'Your colors, logo, and wordmark — the whole board becomes your program.' },
    { title: 'Team Culture Graphics', body: 'Rotate your own slogans and motivational artwork during warmups.' },
    { title: 'Schedule Importer', body: 'Bring in your season by screenshot, CSV, PDF, or paste — then run every game off kickoff.' },
  ]

  const steps: { n: string; title: string; body: string }[] = [
    { n: '1', title: 'Pick your program', body: 'Select your school and load your season schedule.' },
    { n: '2', title: 'Confirm your next game', body: 'The board auto-loads your next game and kickoff — adjust anything.' },
    { n: '3', title: 'Build your routine', body: 'Start from a template and shape your pre-game timeline to the second.' },
    { n: '4', title: 'Put it on the TVs', body: 'Open a display link on every facility screen and run game day.' },
  ]

  return (
    <div className="min-h-full w-full overflow-y-auto bg-[#05070f] text-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070f]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="font-display text-xl font-extrabold uppercase tracking-wide sm:text-2xl">{product}</div>
          <nav className="flex items-center gap-3">
            <a href="#pricing" className="hidden text-sm font-semibold text-slate-300 hover:text-white sm:inline">Pricing</a>
            <a href="#faq" className="hidden text-sm font-semibold text-slate-300 hover:text-white sm:inline">FAQ</a>
            <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white">Sign in</Link>
            <Link to="/signup" className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold tracking-wide text-navy-950 hover:bg-emerald-400">
              Start Free Trial
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-10 pt-14 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.18),transparent_70%)]" />
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">Pre-Game Operations for College Football</p>
        <h1 className="mx-auto max-w-4xl font-display text-5xl font-extrabold uppercase leading-[1.03] tracking-tight sm:text-7xl">
          Run Game Day Like a<br /> Championship Program
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
          Turn your college football pregame routine into one live, team-branded countdown that keeps your
          staff and facility on schedule — from specialists out to kickoff.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link to="/signup" className="rounded-full bg-emerald-500 px-8 py-3 text-base font-extrabold uppercase tracking-wide text-navy-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
            Start Your {PLAN.trialDays}-Day Free Trial
          </Link>
          <a href="#how" className="rounded-full border border-white/25 px-8 py-3 text-base font-extrabold uppercase tracking-wide hover:bg-white/10">
            See the Board
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-400">{TRIAL_POLICY.short}</p>
      </section>

      {/* Product preview (real product UI, not stock) */}
      <section id="how" className="mx-auto max-w-6xl px-6 pb-14 pt-2">
        <BoardPreview />
        <p className="mt-3 text-center text-xs text-slate-500">The live operator board — mirrored to every TV in your facility.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <TimelinePreview />
            <p className="mt-2 text-center text-xs text-slate-500">Build your routine to the second — the whole timeline shifts with the anchor.</p>
          </div>
          <div>
            <SchedulePreview />
            <p className="mt-2 text-center text-xs text-slate-500">Your season, with the next game ready to load. Import any team in seconds.</p>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section className="mx-auto max-w-5xl px-6 pb-16 text-center">
        <h2 className="font-display text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">One game. One timeline. One live countdown.</h2>
        <p className="mx-auto mt-4 max-w-3xl text-slate-300">
          GameDayOps replaces the printed run-of-show, the group text, and the stopwatch with a single source of
          truth. Set your kickoff once and every position group, coach, and TV in the building counts down to the
          same second — automatically.
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 font-display text-lg font-extrabold text-navy-950">{s.n}</div>
              <h3 className="mt-4 font-display text-lg font-extrabold uppercase tracking-wide">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-8 text-center font-display text-3xl font-extrabold uppercase tracking-tight">Built for football operations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="font-display text-base font-extrabold uppercase tracking-wide text-emerald-300">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-4xl scroll-mt-20 px-6 pb-6">
        <h2 className="mb-2 text-center font-display text-4xl font-extrabold uppercase tracking-tight">One simple price</h2>
        <p className="mb-8 text-center text-slate-400">Everything included. No tiers, no add-ons. Cancel anytime.</p>
        <PricingCards />
        <p className="mt-5 text-center text-sm text-slate-400">{TRIAL_POLICY.sentence}</p>
        <div className="mt-6 text-center">
          <Link to="/signup" className="rounded-full bg-emerald-500 px-8 py-3 font-extrabold uppercase tracking-wide text-navy-950 hover:bg-emerald-400">
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-16">
        <h2 className="mb-6 text-center font-display text-3xl font-extrabold uppercase tracking-tight">Frequently asked</h2>
        <Faq />
      </section>

      {/* Contact / support */}
      <section id="contact" className="mx-auto max-w-3xl scroll-mt-20 px-6 pb-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">Need help? Talk to us.</h2>
          <p className="mt-2 text-sm text-slate-400">Questions, a demo, or help getting your program set up — send a note and we'll get back to you.</p>
          <div className="mt-6"><ContactForm /></div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-20 text-center">
        <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-b from-emerald-500/10 to-transparent p-12">
          <h2 className="font-display text-4xl font-extrabold uppercase tracking-tight">Bring it to your program</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">Load your schedule, set your colors, and put it on every TV in the building.</p>
          <div className="mt-8">
            <Link to="/signup" className="rounded-full bg-emerald-500 px-8 py-3 font-extrabold uppercase tracking-wide text-navy-950 hover:bg-emerald-400">
              Start Your {PLAN.trialDays}-Day Free Trial
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">{TRIAL_POLICY.short}</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

function safeName(): string {
  try {
    return productConfig().productName
  } catch {
    return 'GameDayOps College'
  }
}

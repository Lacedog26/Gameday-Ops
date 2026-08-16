import { Link } from 'react-router-dom'
import { productConfig } from '../../product'

// Public-facing marketing page for the product (GameDayOps College / NFL).
// Product-branded (neutral), never team-branded, and exposes no customer data.
export default function Landing() {
  const product = productConfig().productName

  const features: { title: string; body: string }[] = [
    { title: 'Live Game-Day Countdown', body: 'One kickoff time drives every clock on every screen — always in sync.' },
    { title: 'Position / Group Timing', body: 'K/P/LS, QBs, offense, defense — each group knows exactly when to hit the field.' },
    { title: 'Automated Alerts', body: '5-minute, 2-minute, 30-second, and GO NOW escalations no one can miss.' },
    { title: 'Pre-Game Schedules', body: 'Build and reuse editable pre-game templates for home, road, and primetime.' },
    { title: 'Multiple TV Displays', body: 'Register any number of TVs; every one live-syncs to the same board.' },
    { title: 'Team Branding', body: 'Your logo, colors, and wordmark — the whole board becomes your program.' },
    { title: 'Team Culture Graphics', body: 'Rotate your own slogans and motivational artwork during warmups.' },
    { title: 'FBS + FCS Support', body: 'Every division and conference, realignment-safe and season-aware.' },
    { title: 'Editable Everything', body: 'Schedules, kickoffs, templates, and events — change anything, no developer needed.' },
  ]

  return (
    <div className="min-h-full w-full overflow-y-auto bg-[#05070f] text-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="font-display text-2xl font-extrabold uppercase tracking-wide">
          {product}
        </div>
        <div className="flex items-center gap-3">
          <a href="mailto:hello@pregameopscfb.app?subject=GameDayOps%20College%20Demo"
             className="hidden rounded-full border border-white/20 px-5 py-2 text-sm font-bold tracking-wide hover:bg-white/10 sm:inline-block">
            Request a Demo
          </a>
          <Link to="/" className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold tracking-wide text-navy-950 hover:bg-emerald-400">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-14 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.18),transparent_70%)]" />
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">Pre-Game Operations, Simplified</p>
        <h1 className="mx-auto max-w-4xl font-display text-5xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-7xl">
          Run game day like a<br /> championship program
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
          {product} is the pre-game operations platform for football programs — a synchronized,
          TV-ready countdown that gets every position group on the field at the right second.
        </p>
        <div className="mt-9 flex items-center justify-center gap-4">
          <Link to="/" className="rounded-full bg-emerald-500 px-8 py-3 text-base font-extrabold uppercase tracking-wide text-navy-950 hover:bg-emerald-400">
            Get Started
          </Link>
          <a href="mailto:hello@pregameopscfb.app?subject=GameDayOps%20College%20Demo"
             className="rounded-full border border-white/25 px-8 py-3 text-base font-extrabold uppercase tracking-wide hover:bg-white/10">
            Request a Demo
          </a>
        </div>
        <p className="mt-4 text-xs uppercase tracking-widest text-slate-500">FBS &amp; FCS · Multi-TV · Team-branded</p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="font-display text-lg font-extrabold uppercase tracking-wide text-emerald-300">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24 text-center">
        <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-b from-emerald-500/10 to-transparent p-12">
          <h2 className="font-display text-4xl font-extrabold uppercase tracking-tight">Bring it to your program</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Upload your logo, set your colors, load your schedule, and put it on every TV in the building.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/" className="rounded-full bg-emerald-500 px-8 py-3 font-extrabold uppercase tracking-wide text-navy-950 hover:bg-emerald-400">
              Get Started
            </Link>
            <a href="mailto:hello@pregameopscfb.app?subject=GameDayOps%20College%20Demo"
               className="rounded-full border border-white/25 px-8 py-3 font-extrabold uppercase tracking-wide hover:bg-white/10">
              Request a Demo
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-slate-500">
        {product} · Part of the GameDayOps platform
      </footer>
    </div>
  )
}

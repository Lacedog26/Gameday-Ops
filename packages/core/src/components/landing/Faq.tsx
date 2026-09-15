import { useState } from 'react'
import { PLAN } from '../../billing'

// Honest FAQ — every answer reflects what the product actually does today.
const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is GameDayOps?',
    a: 'A pre-game operations system for college football. It turns your game-day routine into one live, team-branded countdown that keeps every position group, coach, and TV in the building on the same schedule — driven off a single kickoff time.',
  },
  {
    q: 'Who is it for?',
    a: 'Coaches, directors of football operations, and football staff who run the pre-game routine and want everyone on the field at the right second.',
  },
  {
    q: 'How does the 14-day free trial work?',
    a: `You get full access for ${PLAN.trialDays} days. A credit card is required to start, but you are not charged today. When the trial ends your plan renews automatically unless you cancel first.`,
  },
  {
    q: 'Is a credit card required?',
    a: 'Yes. A card is required to start the trial so your subscription can continue seamlessly if you keep it — but there is no charge during the trial, and you can cancel anytime before it ends to avoid being billed.',
  },
  {
    q: 'What happens after the trial?',
    a: `Your selected plan begins automatically — $${PLAN.monthlyUsd}/month or $${PLAN.annualUsd}/year — unless you cancel before the trial ends. Manage or cancel anytime from Admin → Billing.`,
  },
  {
    q: 'How does the TV display work?',
    a: 'From Admin you create a display and get a secure link. Open that link on any TV or computer in your facility, go fullscreen, and it stays in sync with your board — no login on the TV itself.',
  },
  {
    q: 'Can I customize my pre-game routine?',
    a: 'Yes. Start from a home or road template and edit every event — labels, notes, order, and timing to the second. Change the kickoff and every event time recalculates automatically.',
  },
  {
    q: 'Can I use my own team graphics?',
    a: 'Yes. Upload your logo and set your colors, and add your own culture graphics. One graphic shows continuously; add more and they rotate during warmups.',
  },
  {
    q: 'Can I import my schedule?',
    a: 'Yes. Major programs come with a current-season schedule to start, and you can import any team’s schedule by screenshot, CSV, PDF, or paste. Kickoff times that are not yet set stay “TBD” until you set them — we never invent a time.',
  },
  {
    q: 'Does it support FBS?',
    a: 'Every FBS program is selectable and fully brandable. Current-season schedules ship for major programs at launch, with one-click import for any team.',
  },
  {
    q: 'Does it support FCS?',
    a: 'Every FCS program is selectable and brandable as well. FCS schedules are supported through the same importer; not every FCS schedule is pre-loaded at launch.',
  },
  {
    q: 'Can multiple staff members use it?',
    a: 'Today an account belongs to your program, and you can open the board on as many TVs and devices as you like using display links. Separate per-staff logins are on the roadmap; for now, staff share the program account.',
  },
]

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="flex flex-col gap-2">
      {FAQ.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.q} className="rounded-xl border border-white/10 bg-white/[0.03]">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-display text-base font-bold tracking-wide">{item.q}</span>
              <span className={`shrink-0 text-emerald-300 transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
            </button>
            {isOpen && <p className="px-5 pb-5 text-sm leading-relaxed text-slate-300">{item.a}</p>}
          </div>
        )
      })}
    </div>
  )
}

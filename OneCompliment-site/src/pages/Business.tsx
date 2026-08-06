import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'

const STEPS = [
  {
    title: 'You set up a group',
    desc: 'Create a group for your team, class, or organization. Invite members with a link — no app download required.',
  },
  {
    title: 'Everyone gets the same daily challenge',
    desc: "Each day there's one constraint: say it in 10 words, say it about a moment, say it out loud. The challenge makes it real.",
  },
  {
    title: 'Members write a genuine compliment',
    desc: "Each person chooses someone in their life — a teammate, a student, a coworker — and lifts them up using that day's rule.",
  },
  {
    title: 'The group streak grows together',
    desc: "When everyone blooms, the group streak goes up. Milestones at 7, 30, and 100 days. Don't let your squad down.",
  },
]

const ORG_GRID = [
  { icon: '🏫', name: 'Schools', desc: 'Run a classroom kindness challenge. Build culture between students and staff.' },
  { icon: '🏆', name: 'Sports Teams', desc: 'Strengthen team culture beyond the field. Coaches and players lift each other daily.' },
  { icon: '⛪', name: 'Churches', desc: "Turn Sunday's message into a daily practice. A spiritual kindness habit for your congregation." },
  { icon: '🏢', name: 'Companies', desc: 'Improve employee recognition and morale — with zero budget and zero overhead.' },
  { icon: '🤝', name: 'Nonprofits', desc: 'Sustain the energy of volunteers and staff who give so much of themselves.' },
  { icon: '🎓', name: 'Universities', desc: 'Dorms, clubs, Greek life — any community that wants to feel more connected.' },
]

const WHY_LIST = [
  { icon: '🎯', strong: 'Specificity builds trust.', text: 'When someone names exactly what you did and why it mattered, it lands completely differently than a generic compliment.' },
  { icon: '🔥', strong: 'Streaks create accountability.', text: "The group streak means no one wants to be the reason it breaks. Habits form around that." },
  { icon: '⏱', strong: 'Under 3 minutes keeps the bar low.', text: 'No workshops. No training. Just one genuine thing, once a day.' },
  { icon: '🌱', strong: 'Consistency creates culture.', text: "A team that lifts each other daily for 30 days is a fundamentally different team than one that doesn't." },
]

const USE_CASES = [
  { emoji: '🏫', title: 'A high school English teacher in Texas', quote: 'She runs OneC🌻mpliment as a weekly Friday ritual. Students spend the last 5 minutes writing a compliment to someone outside class. She says the classroom atmosphere shifted within two weeks.' },
  { emoji: '🏆', title: 'A college soccer coach in Ohio', quote: "He uses it every preseason as a team bonding challenge. Players aren't allowed to compliment their own performance — only something they noticed in a teammate. The rule changes everything." },
  { emoji: '🏢', title: 'A remote team of 22 people', quote: 'Their HR lead set up a company-wide group during a rough quarter. They hit a 14-day streak together. "It was the most connected we\'d felt in months — and it cost nothing."' },
  { emoji: '⛪', title: 'A small church in North Carolina', quote: "Their pastor introduced it as a Lenten practice — one compliment, every day, for 40 days. Members said it became the most meaningful spiritual discipline they'd tried in years." },
]

export default function Business() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    data.set('Submitted At', new Date().toISOString())
    // res.ok must be checked: fetch only rejects on network failure, so an
    // unregistered form name (404) or server error used to show "Thank you!"
    // while the inquiry went nowhere.
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data as never).toString(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setSubmitted(true)
      })
      .catch(() => {
        alert('Something went wrong. Please email us directly at info@onecompliment.app')
      })
  }

  return (
    <>
      <nav
        className="flex justify-between items-center"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(12,12,12,0.97)',
          borderBottom: '1px solid var(--bord)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '14px 24px',
        }}
      >
        <Brand size={13} />
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--faint)',
            fontSize: 13,
            textDecoration: 'none',
            border: '1px solid var(--bord)',
            borderRadius: 20,
            padding: '7px 14px',
          }}
        >
          ← Back to app
        </Link>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* HERO */}
        <div
          className="flex flex-col gap-6"
          style={{ padding: '80px 24px 64px', maxWidth: 600, margin: '0 auto' }}
        >
          <div
            className="font-mono inline-flex items-center gap-2 self-start"
            style={{
              background: 'rgba(245,200,66,.10)',
              border: '1px solid rgba(245,200,66,.25)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 11,
              color: 'var(--color-gold)',
              letterSpacing: '.12em',
              textTransform: 'uppercase',
            }}
          >
            🏢 For Organizations
          </div>
          <h1
            className="font-bold"
            style={{ fontSize: 'clamp(32px,8vw,52px)', lineHeight: 1.1 }}
          >
            One compliment.<br />Every day.<br />
            <em style={{ color: 'var(--color-gold)' }}>For your whole team.</em>
          </h1>
          <p
            style={{
              fontSize: 18,
              color: 'var(--dim)',
              lineHeight: 1.75,
              maxWidth: 480,
            }}
          >
            OneC🌻mpliment is a daily kindness challenge that makes the people around you feel seen
            — one person at a time, every single day.
          </p>
          <div className="flex gap-2.5 flex-wrap">
            <HeroStat value="30" label="unique challenges" />
            <HeroStat value="<3 min" label="per day" />
            <HeroStat value="0" label="apps to install" />
          </div>
          <a
            href="#contact"
            className="oc-btn"
            style={{
              alignSelf: 'flex-start',
              width: 'auto',
              textDecoration: 'none',
            }}
          >
            🌻 Bring It to Your Team
          </a>
        </div>

        <SectionDivider />

        {/* HOW IT WORKS */}
        <Section label="How It Works" title="Simple enough that everyone actually does it.">
          <div className="flex flex-col gap-5">
            {STEPS.map((s, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div
                  className="font-mono font-bold flex items-center justify-center"
                  style={{
                    fontSize: 11,
                    color: 'var(--color-gold)',
                    background: 'rgba(245,200,66,.10)',
                    border: '1px solid rgba(245,200,66,.22)',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    className="font-bold"
                    style={{ fontSize: 16, color: 'var(--text)' }}
                  >
                    {s.title}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--faint)', lineHeight: 1.7 }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <SectionDivider />

        {/* WHO IT'S FOR */}
        <Section
          label="Who It's For"
          title="Built for any group that wants to lift each other up."
        >
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {ORG_GRID.map((o) => (
              <div
                key={o.name}
                className="flex flex-col gap-1.5"
                style={{
                  background: 'var(--surf)',
                  border: '1px solid var(--bord)',
                  borderRadius: 14,
                  padding: '18px 16px',
                }}
              >
                <div style={{ fontSize: 28 }}>{o.icon}</div>
                <div className="font-bold" style={{ fontSize: 14, color: 'var(--text)' }}>
                  {o.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--faint)', lineHeight: 1.6 }}>
                  {o.desc}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <SectionDivider />

        {/* WHY IT WORKS */}
        <Section label="Why It Works" title="The constraint is the point.">
          <p style={{ fontSize: 16, color: 'var(--dim)', lineHeight: 1.75 }}>
            Anyone can say "good job." The daily challenge forces something more specific, more
            honest, and more memorable.
          </p>
          <div className="flex flex-col gap-3.5">
            {WHY_LIST.map((w) => (
              <div
                key={w.strong}
                className="flex gap-3.5 items-start"
                style={{
                  background: 'rgba(255,255,255,.025)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.5 }}>{w.icon}</span>
                <span style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.7 }}>
                  <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{w.strong}</strong>{' '}
                  {w.text}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <SectionDivider />

        {/* USE CASES */}
        <Section label="Real Examples" title="How teams are using it.">
          {USE_CASES.map((u) => (
            <div
              key={u.title}
              className="flex flex-col gap-2"
              style={{
                background: 'var(--surf)',
                border: '1px solid var(--bord)',
                borderRadius: 14,
                padding: '18px 20px',
                marginBottom: 12,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span style={{ fontSize: 22 }}>{u.emoji}</span>
                <span
                  className="font-bold"
                  style={{ fontSize: 15, color: 'var(--text)' }}
                >
                  {u.title}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: 'var(--dim)',
                  lineHeight: 1.65,
                  paddingLeft: 12,
                  borderLeft: '2px solid rgba(245,200,66,.30)',
                }}
              >
                {u.quote}
              </div>
            </div>
          ))}
        </Section>

        <SectionDivider />

        {/* CTA */}
        <div className="flex flex-col" style={{ padding: '72px 24px', maxWidth: 600, margin: '0 auto' }}>
          <div
            className="text-center flex flex-col items-center gap-4.5"
            style={{
              background: 'rgba(245,200,66,.07)',
              border: '1px solid rgba(245,200,66,.20)',
              borderRadius: 16,
              padding: '32px 24px',
            }}
          >
            <div style={{ fontSize: 48 }}>🌻</div>
            <h2
              className="font-bold"
              style={{ fontSize: 'clamp(24px,5vw,32px)', lineHeight: 1.2 }}
            >
              Ready to start a kindness challenge with your team?
            </h2>
            <p
              style={{
                fontSize: 15,
                color: 'var(--dim)',
                lineHeight: 1.7,
                maxWidth: 380,
              }}
            >
              It takes 2 minutes to set up. No app download. No account required for members.
              Just one challenge, every day.
            </p>
            <a
              href="#contact"
              className="oc-btn"
              style={{ maxWidth: 340, textDecoration: 'none' }}
            >
              🌻 Start a Team Challenge
            </a>
            <Link
              to="/"
              className="oc-btn-ghost"
              style={{ maxWidth: 340, textDecoration: 'none' }}
            >
              Try the challenge yourself first
            </Link>
          </div>
        </div>

        <SectionDivider />

        {/* CONTACT */}
        <div
          id="contact"
          className="flex flex-col gap-8"
          style={{ padding: '72px 24px', maxWidth: 600, margin: '0 auto' }}
        >
          <div
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '.25em',
              textTransform: 'uppercase',
              color: 'var(--color-green)',
            }}
          >
            Get in Touch
          </div>
          <h2
            className="font-bold"
            style={{ fontSize: 'clamp(24px,5vw,32px)', lineHeight: 1.2 }}
          >
            Let's bring this to your team.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.75 }}>
            Tell us a little about your group. We'll reach out within 24 hours to help you get set
            up.
          </p>
          <div
            style={{
              background: 'rgba(168,230,207,.06)',
              border: '1px solid rgba(168,230,207,.18)',
              borderRadius: 16,
              padding: 22,
            }}
          >
            {!submitted ? (
              <form
                className="flex flex-col gap-3.5"
                name="org-inquiry"
                method="POST"
                data-netlify="true"
                onSubmit={handleSubmit}
              >
                <input type="hidden" name="form-name" value="org-inquiry" />
                <input type="hidden" name="Source" value="Teams Page" />
                <input type="hidden" name="Submitted At" value="" />
                <FormField label="Your Name" name="Full Name" placeholder="First and last name" maxLength={80} required />
                <FormField label="Email Address" name="Email Address" type="email" placeholder="you@yourorg.com" maxLength={120} required />
                <FormField label="Organization & Role" name="Organization / Role" placeholder="e.g. Lincoln High School — PE Teacher" maxLength={120} required />
                <FormField label="Group Size" name="Group Size" placeholder="e.g. 25 students, 12 staff members..." maxLength={80} />
                <FormFieldArea label="Anything else?" name="Message" placeholder="Tell us about your group and what you're hoping to create..." maxLength={500} />
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--faint)',
                    textAlign: 'center',
                    lineHeight: 1.5,
                  }}
                >
                  By submitting this form, you agree to our{' '}
                  <Link to="/privacy" style={{ color: 'var(--color-gold)' }}>
                    Privacy Policy
                  </Link>{' '}
                  and consent to being contacted about your inquiry.
                </div>
                <button type="submit" className="oc-btn">Talk to Us →</button>
                <div
                  className="font-mono text-center"
                  style={{ fontSize: 11, color: 'var(--faint)' }}
                >
                  We read every message. Usually respond same day.
                </div>
              </form>
            ) : (
              <div
                className="flex flex-col items-center gap-3.5 text-center"
                style={{ padding: '16px 0' }}
              >
                <div style={{ fontSize: 48 }}>🌻</div>
                <div
                  className="font-bold"
                  style={{ fontSize: 18, color: 'var(--color-green)' }}
                >
                  Thank you!
                </div>
                <div
                  style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.7 }}
                >
                  We got your message and will be in touch within 24 hours.
                </div>
              </div>
            )}
          </div>
          <div className="text-center">
            <p style={{ fontSize: 13, color: 'var(--faint)', lineHeight: 1.7 }}>
              Or reach us directly at{' '}
              <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
                info@onecompliment.app
              </a>
            </p>
          </div>
        </div>

        <SectionDivider />

        {/* FOOTER */}
        <div
          className="flex flex-col items-center gap-3 text-center"
          style={{ padding: '40px 24px 60px', maxWidth: 600, margin: '0 auto' }}
        >
          <Brand size={16} />
          <div
            className="font-mono"
            style={{ fontSize: 12, color: 'var(--faint)' }}
          >
            One compliment. Every day. · onecompliment.app
          </div>
          <Link
            to="/"
            style={{
              fontSize: 13,
              color: 'var(--faint)',
              textDecoration: 'none',
              border: '1px solid var(--bord)',
              borderRadius: 20,
              padding: '8px 18px',
            }}
          >
            ← Back to the app
          </Link>
          <Link to="/privacy" style={{ fontSize: 12, color: 'var(--faint)' }}>
            Privacy Policy
          </Link>
        </div>
      </div>
    </>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="text-center"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
        padding: '14px 18px',
        flex: 1,
        minWidth: 100,
      }}
    >
      <div
        className="font-bold font-mono"
        style={{ fontSize: 22, color: 'var(--color-gold)' }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Section({
  label,
  title,
  children,
}: {
  label: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col gap-8"
      style={{ padding: '72px 24px', maxWidth: 600, margin: '0 auto' }}
    >
      <div className="oc-label">{label}</div>
      <h2
        className="font-bold"
        style={{ fontSize: 'clamp(24px,5vw,32px)', lineHeight: 1.2 }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function SectionDivider() {
  return (
    <div
      style={{
        height: 1,
        background: 'var(--bord)',
        maxWidth: 600,
        margin: '0 auto',
        width: 'calc(100% - 48px)',
      }}
    />
  )
}

function FormField({
  label,
  ...rest
}: {
  label: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--faint)',
        }}
      >
        {label}
      </div>
      <input className="oc-input" {...rest} />
    </div>
  )
}

function FormFieldArea({
  label,
  ...rest
}: {
  label: string
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--faint)',
        }}
      >
        {label}
      </div>
      <textarea
        className="oc-input"
        rows={4}
        style={{ resize: 'none', lineHeight: 1.65 }}
        {...rest}
      />
    </div>
  )
}

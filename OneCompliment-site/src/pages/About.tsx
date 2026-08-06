import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'

const STEPS = [
  {
    n: '01',
    title: 'Get your prompt',
    text: 'A new prompt each day, designed to surface something specific and real.',
  },
  {
    n: '02',
    title: 'Pick a person',
    text: 'Anyone in your life. Close or distant. The app helps you rotate.',
  },
  {
    n: '03',
    title: 'Send it',
    text: 'Share it directly, or save it for the right moment. Your streak grows.',
  },
]

export default function About() {
  return (
    <>
      <nav
        className="flex justify-between items-center"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(12,12,12,0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--bord)',
          padding: '14px 24px',
        }}
      >
        <Brand size={13} />
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: 'var(--faint)',
            border: '1px solid var(--bord)',
            borderRadius: 20,
            padding: '7px 14px',
            fontSize: 13,
          }}
        >
          ← Back to app
        </Link>
      </nav>

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 760,
          margin: '0 auto',
          padding: '40px 24px 72px',
        }}
      >
        {/* Hero */}
        <div className="flex flex-col gap-4" style={{ marginBottom: 28 }}>
          <div className="oc-label">About OneC🌻mpliment</div>
          <h1
            className="font-bold"
            style={{ fontSize: 'clamp(34px,7vw,52px)', lineHeight: 1.08 }}
          >
            Be a sun. Help someone bloom.
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: 'var(--dim)',
              maxWidth: 580,
            }}
          >
            One kind word a day. That's it. Build the habit in 30 seconds — and
            watch the people in your life bloom.
          </p>
        </div>

        {/* What it is / Why it exists */}
        <div
          style={{
            background: 'var(--surf)',
            border: '1px solid var(--bord)',
            borderRadius: 20,
            padding: 24,
            marginTop: 18,
          }}
        >
          <Section title="What it is">
            <p>
              OneC🌻mpliment is a daily kindness habit app. Every day, you get one
              short prompt designed to spark a real, specific compliment for
              someone in your life — a partner, a teammate, a coworker, a
              stranger. You write it. You send it. The whole thing takes 30
              seconds.
            </p>
            <p>
              Over time, the habit reshapes how you see the people around you.
              You start noticing the good things first. The people you compliment
              feel <strong>seen</strong> — and that's where it really compounds.
            </p>
          </Section>
          <Divider />
          <Section title="Why it exists">
            <p>
              Most of us go entire weeks without telling someone what we
              genuinely appreciate about them. Not because we don't feel it —
              because life moves fast and the moment passes. OneC🌻mpliment fixes
              that with the simplest possible nudge: one prompt, one person, one
              minute.
            </p>
            <p>
              The science is clear that giving and receiving genuine appreciation
              strengthens relationships, lowers stress, and improves mental
              health. The hard part is consistency. So we built a daily habit
              loop around it.
            </p>
          </Section>
          <Divider />
          <Section title="How it works">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                marginTop: 12,
              }}
            >
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="flex flex-col gap-1.5"
                  style={{
                    background: 'rgba(245,200,66,.05)',
                    border: '1px solid rgba(245,200,66,.18)',
                    borderRadius: 14,
                    padding: '18px 16px',
                  }}
                >
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 14,
                      color: 'var(--color-gold)',
                      fontStyle: 'italic',
                    }}
                  >
                    {s.n}
                  </div>
                  <div
                    className="font-bold"
                    style={{ fontSize: 14, color: 'var(--text)' }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{ fontSize: 13, color: 'var(--faint)', lineHeight: 1.6 }}
                  >
                    {s.text}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* CTA strip */}
        <div
          className="text-center flex flex-col items-center gap-4"
          style={{
            background: 'rgba(245,200,66,.07)',
            border: '1px solid rgba(245,200,66,.20)',
            borderRadius: 16,
            padding: '32px 24px',
            marginTop: 34,
          }}
        >
          <div style={{ fontSize: 40 }}>🌻</div>
          <h2
            className="font-bold"
            style={{ fontSize: 'clamp(22px,4vw,28px)', lineHeight: 1.2 }}
          >
            Ready to build the habit?
          </h2>
          <Link
            to="/"
            className="oc-btn"
            style={{ maxWidth: 280, textDecoration: 'none' }}
          >
            Open the app
          </Link>
        </div>

        <div
          className="flex gap-3"
          style={{
            marginTop: 28,
            paddingTop: 22,
            borderTop: '1px solid var(--bord)',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
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
          <div className="flex gap-3" style={{ fontSize: 13 }}>
            <Link to="/contact" style={{ color: 'var(--faint)' }}>
              Contact
            </Link>
            <Link to="/privacy" style={{ color: 'var(--faint)' }}>
              Privacy
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5" style={{ marginTop: 20 }}>
      <h2
        className="font-bold"
        style={{ fontSize: 28, lineHeight: 1.2, marginTop: 18 }}
      >
        {title}
      </h2>
      <div className="oc-prose">{children}</div>
    </section>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--bord)', margin: '20px 0 8px' }} />
}

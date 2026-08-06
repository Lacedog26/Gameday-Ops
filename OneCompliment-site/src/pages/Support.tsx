import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'

// Support hub — exists primarily so the App Store Connect "Support URL"
// (Guideline 1.5) points at a page with real, self-serve support
// content instead of the marketing homepage. Apple's reviewer should be
// able to land here and immediately find:
//   - how to cancel a subscription / get a refund
//   - how to delete an account
//   - how to recover access if they lose their email
//   - direct contact info + a working email link
//   - links to Privacy and Terms
//
// If anything below changes, double-check it still answers Apple's
// Guideline 1.5 question: "where can a user ask questions and request
// support?" — that's the bar.

type Faq = {
  q: string
  a: React.ReactNode
}

const FAQS: Faq[] = [
  {
    q: 'How do I cancel my OneCompliment Pro subscription?',
    a: (
      <>
        Subscriptions are billed and managed by Apple (iOS) or Google (Android) —
        not by us — so cancellation has to be done there:
        <ul style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.75 }}>
          <li>
            <strong>iPhone / iPad:</strong> Settings → tap your Apple ID name → Subscriptions →
            OneCompliment → Cancel Subscription.
          </li>
          <li>
            <strong>Android:</strong> Play Store app → tap your profile → Payments &
            subscriptions → Subscriptions → OneCompliment → Cancel subscription.
          </li>
        </ul>
        Canceling stops the next renewal but does not refund the current period —
        you keep Pro features until the date already paid for runs out. See the
        refund question below if you'd like the current period refunded too.
      </>
    ),
  },
  {
    q: 'How do I get a refund?',
    a: (
      <>
        Refunds for App Store and Play Store purchases are handled by Apple
        and Google directly — we don't have access to your billing.
        <ul style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.75 }}>
          <li>
            <strong>Apple:</strong> visit{' '}
            <a
              href="https://reportaproblem.apple.com"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--color-gold)' }}
            >
              reportaproblem.apple.com
            </a>{' '}
            and choose your OneCompliment purchase.
          </li>
          <li>
            <strong>Google:</strong> Play Store → Menu → Account → Purchase history →
            tap the order → Request a refund.
          </li>
        </ul>
        If you have trouble, email us at{' '}
        <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)' }}>
          info@onecompliment.app
        </a>{' '}
        and we'll help.
      </>
    ),
  },
  {
    q: 'How do I delete my account and all my data?',
    a: (
      <>
        Inside the app: <strong>Settings → Other → Delete Account</strong>. Confirm
        once and your profile, compliments, streaks, and group/team memberships
        are permanently removed. No follow-up, no email exchange — the in-app
        button is the fastest path.
        <br />
        <br />
        If you can't reach the button (lost access, app won't open), email{' '}
        <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)' }}>
          info@onecompliment.app
        </a>
        . If you linked an email to your account, send from that address. If you
        didn't, include your username and roughly when you signed up so we can
        verify the account is yours. We'll delete it within 7 days.
      </>
    ),
  },
  {
    q: 'I forgot my email or lost access to my account — what now?',
    a: (
      <>
        OneCompliment lets you start anonymously with just a username. If you
        later linked an email, sign in by entering that email on the home screen
        and confirming the one-time code we send to it.
        <br />
        <br />
        If you never linked an email and you've switched devices or reinstalled
        the app, the previous account can't be recovered — without an email link,
        the account lives on the original device install and there's no way for
        us to prove the new device is the same person. Start fresh with a new
        username, then immediately go to{' '}
        <strong>Settings → Link Email</strong> so this can't happen next time.
        <br />
        <br />
        Stuck on something this doesn't cover? Email{' '}
        <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)' }}>
          info@onecompliment.app
        </a>{' '}
        with what you remember and we'll dig in.
      </>
    ),
  },
  {
    q: 'How do I report a bug or share feedback?',
    a: (
      <>
        Two options:
        <ul style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.75 }}>
          <li>
            In the app: <strong>Settings → Feedback</strong> — leave a rating and a
            note, it lands in our inbox.
          </li>
          <li>
            Or use the contact form on our{' '}
            <Link to="/contact" style={{ color: 'var(--color-gold)' }}>
              Contact page
            </Link>
            , or email{' '}
            <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)' }}>
              info@onecompliment.app
            </a>{' '}
            directly. Including the device, OS version, and what you tapped right
            before the bug appeared makes things much faster to fix.
          </li>
        </ul>
      </>
    ),
  },
  {
    q: 'Where can I read your Privacy Policy and Terms of Use?',
    a: (
      <>
        <ul style={{ marginTop: 4, paddingLeft: 18, lineHeight: 1.75 }}>
          <li>
            <Link to="/privacy" style={{ color: 'var(--color-gold)' }}>
              Privacy Policy
            </Link>{' '}
            — what we collect and why.
          </li>
          <li>
            <a
              href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--color-gold)' }}
            >
              Terms of Use (Apple Standard EULA)
            </a>{' '}
            — the standard auto-renewable subscription terms.
          </li>
        </ul>
      </>
    ),
  },
  {
    q: 'Is OneCompliment free?',
    a: (
      <>
        Yes — the core daily compliment, streaks, groups, and recap are all free,
        forever. Pro is an optional auto-renewing subscription that adds streak
        freezes, unlimited groups, and full compliment history. You can read
        prices and terms inside the app under <strong>Upgrade to Pro</strong>.
      </>
    ),
  },
]

export default function Support() {
  // Per-page <title> so this URL shows up as "Support — OneCompliment"
  // in App Review's browser tab and in link previews — leaves no doubt
  // that this is the support page when Apple's reviewer clicks the
  // Support URL we point at from App Store Connect.
  useEffect(() => {
    const prev = document.title
    document.title = 'Support — OneC🌻mpliment'
    return () => {
      document.title = prev
    }
  }, [])

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
          maxWidth: 720,
          margin: '0 auto',
          padding: '40px 24px 72px',
        }}
      >
        {/* Hero */}
        <div className="flex flex-col gap-4" style={{ marginBottom: 28 }}>
          <div className="oc-label">Support</div>
          <h1
            className="font-bold"
            style={{ fontSize: 'clamp(34px,7vw,48px)', lineHeight: 1.08 }}
          >
            Need a hand?
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: 'var(--dim)',
              maxWidth: 560,
            }}
          >
            Support for the OneCompliment iOS app, Android app, and web app —
            this page covers all three. Most questions are answered below; if
            yours isn't, email{' '}
            <a
              href="mailto:info@onecompliment.app"
              style={{ color: 'var(--color-gold)' }}
            >
              info@onecompliment.app
            </a>{' '}
            and we'll get back to you.
          </p>
        </div>

        {/* Direct contact card — same affordance as /contact so the
            primary "talk to a human" path is one tap from the top. */}
        <a
          href="mailto:info@onecompliment.app"
          className="flex items-center gap-4"
          style={{
            background: 'rgba(245,200,66,.06)',
            border: '1px solid rgba(245,200,66,.20)',
            borderRadius: 16,
            padding: '20px 22px',
            textDecoration: 'none',
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: 32, lineHeight: 1 }}>✉️</div>
          <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
            <div
              className="font-mono"
              style={{
                fontSize: 10,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: 'var(--faint)',
              }}
            >
              Contact support
            </div>
            <div
              className="font-bold"
              style={{
                fontSize: 18,
                color: 'var(--color-gold)',
                marginTop: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              info@onecompliment.app
            </div>
          </div>
          <div style={{ fontSize: 18, color: 'var(--faint)' }}>→</div>
        </a>

        {/* FAQ */}
        <div
          className="flex flex-col"
          style={{
            marginTop: 28,
            gap: 14,
          }}
        >
          <div
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '.25em',
              textTransform: 'uppercase',
              color: 'var(--color-green)',
              marginBottom: 4,
            }}
          >
            Frequently asked
          </div>
          {FAQS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>

        {/* Secondary contact card — for people who prefer a form */}
        <div
          style={{
            background: 'rgba(168,230,207,.06)',
            border: '1px solid rgba(168,230,207,.18)',
            borderRadius: 16,
            padding: 22,
            marginTop: 22,
          }}
        >
          <div
            className="font-bold"
            style={{ fontSize: 17, color: 'var(--text)', marginBottom: 6 }}
          >
            Prefer a contact form?
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--dim)',
              lineHeight: 1.7,
              marginBottom: 14,
            }}
          >
            Our{' '}
            <Link to="/contact" style={{ color: 'var(--color-gold)' }}>
              Contact page
            </Link>{' '}
            has a form that goes to the same inbox.
          </div>
          <Link
            to="/contact"
            className="oc-btn"
            style={{
              textDecoration: 'none',
              textAlign: 'center',
              display: 'inline-block',
              padding: '12px 22px',
            }}
          >
            Open the contact form →
          </Link>
        </div>

        {/* Footer nav */}
        <div
          className="flex gap-3"
          style={{
            marginTop: 34,
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
            <Link to="/about" style={{ color: 'var(--faint)' }}>
              About
            </Link>
            <Link to="/contact" style={{ color: 'var(--faint)' }}>
              Contact
            </Link>
            <Link to="/privacy" style={{ color: 'var(--faint)' }}>
              Privacy
            </Link>
            <a
              href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--faint)' }}
            >
              Terms
            </a>
          </div>
        </div>
      </main>
    </>
  )
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
        padding: '14px 18px',
      }}
    >
      <summary
        className="font-bold"
        style={{
          fontSize: 15,
          color: 'var(--text)',
          cursor: 'pointer',
          listStyle: 'none',
          lineHeight: 1.4,
        }}
      >
        {q}
      </summary>
      <div
        style={{
          fontSize: 14,
          color: 'var(--dim)',
          lineHeight: 1.75,
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--bord)',
        }}
      >
        {a}
      </div>
    </details>
  )
}

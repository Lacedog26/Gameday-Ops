import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const form = e.currentTarget
    const data = new FormData(form)
    data.set('Submitted At', new Date().toISOString())
    // Netlify Forms — same pattern the org-inquiry form uses on /business.
    // res.ok must be checked: fetch only rejects on network failure, so an
    // unregistered form name (404) or server error used to show "Thank you!"
    // while the message went nowhere.
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
      .finally(() => setSubmitting(false))
  }

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
          maxWidth: 640,
          margin: '0 auto',
          padding: '40px 24px 72px',
        }}
      >
        {/* Hero */}
        <div className="flex flex-col gap-4" style={{ marginBottom: 28 }}>
          <div className="oc-label">Contact</div>
          <h1
            className="font-bold"
            style={{ fontSize: 'clamp(34px,7vw,48px)', lineHeight: 1.08 }}
          >
            Get in touch.
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: 'var(--dim)',
              maxWidth: 540,
            }}
          >
            Questions, feedback, partnership ideas, or just want to say hi? We
            read every message — usually respond the same day.
          </p>
        </div>

        {/* Direct email card */}
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
              Email us directly
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

        {/* Form */}
        <div
          style={{
            background: 'rgba(168,230,207,.06)',
            border: '1px solid rgba(168,230,207,.18)',
            borderRadius: 16,
            padding: 22,
            marginTop: 18,
          }}
        >
          <div
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '.25em',
              textTransform: 'uppercase',
              color: 'var(--color-green)',
              marginBottom: 14,
            }}
          >
            Or send us a message
          </div>
          {!submitted ? (
            <form
              className="flex flex-col gap-3.5"
              name="contact"
              method="POST"
              data-netlify="true"
              onSubmit={handleSubmit}
            >
              <input type="hidden" name="form-name" value="contact" />
              <input type="hidden" name="Source" value="Contact Page" />
              <input type="hidden" name="Submitted At" value="" />
              <FormField
                label="Your Name"
                name="Full Name"
                placeholder="First and last name"
                maxLength={80}
                required
              />
              <FormField
                label="Email Address"
                name="Email Address"
                type="email"
                placeholder="you@example.com"
                maxLength={120}
                required
              />
              <FormFieldArea
                label="Your Message"
                name="Message"
                placeholder="Tell us what's on your mind..."
                maxLength={1000}
                required
              />
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--faint)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                By submitting, you agree to our{' '}
                <Link to="/privacy" style={{ color: 'var(--color-gold)' }}>
                  Privacy Policy
                </Link>
                .
              </div>
              <button type="submit" className="oc-btn" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send Message →'}
              </button>
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
              <div style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.7 }}>
                We got your message and will be in touch shortly.
              </div>
            </div>
          )}
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
            <Link to="/support" style={{ color: 'var(--faint)' }}>
              Support
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
        rows={5}
        style={{ resize: 'none', lineHeight: 1.65 }}
        {...rest}
      />
    </div>
  )
}

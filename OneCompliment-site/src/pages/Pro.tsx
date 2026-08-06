import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { useProStatus } from '../hooks/useProStatus'
import { useAuth } from '../hooks/useAuth'
import { getProStripeUrl, withProRef } from '../lib/pro'

const FEATURES = [
  {
    emoji: '🔥',
    name: 'Streak Freeze',
    tag: '1 per week',
    desc: "Life happens. One day a week you can freeze your streak so it doesn't reset. Resets every Monday.",
  },
  {
    emoji: '👥',
    name: 'Unlimited Groups',
    tag: 'vs 8 free',
    desc: 'Free accounts can join up to 8 groups. Pro lets you join unlimited groups.',
  },
  {
    emoji: '📖',
    name: 'Compliment History',
    tag: '365 days',
    desc: "Every compliment you've ever written, saved. A full year of kindness — documented.",
  },
]

export default function Pro() {
  const auth = useAuth()
  const { isPro, refresh } = useProStatus(!auth.loading && !!auth.userId)

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

      <main
        className="oc-wrap"
        style={{ paddingTop: 32, paddingBottom: 80 }}
      >
        {isPro ? (
          <ProActiveState />
        ) : (
          <ProPitch userId={auth.userId} authLoading={auth.loading} onRefresh={refresh} />
        )}
      </main>
    </>
  )
}

function ProActiveState() {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ gap: 20, paddingTop: 32 }}
    >
      <div className="bob" style={{ fontSize: 64 }}>🌻</div>
      <div
        className="font-mono inline-block"
        style={{
          fontSize: 10,
          letterSpacing: '.15em',
          textTransform: 'uppercase',
          background: 'rgba(245,200,66,.15)',
          color: 'var(--color-gold)',
          border: '1px solid rgba(245,200,66,.30)',
          borderRadius: 20,
          padding: '4px 12px',
        }}
      >
        ✦ OneC🌻mpliment Pro
      </div>
      <div
        className="font-bold"
        style={{ fontSize: 'clamp(24px,5vw,32px)', lineHeight: 1.2 }}
      >
        You're Pro.
      </div>
      <div
        style={{
          fontSize: 15,
          color: 'var(--dim)',
          lineHeight: 1.7,
          maxWidth: 360,
        }}
      >
        Thank you for supporting OneCompliment. Streak Freeze, unlimited groups, and Compliment History are all unlocked.
      </div>
      <Link
        to="/"
        className="oc-btn"
        style={{ maxWidth: 320, textDecoration: 'none', textAlign: 'center' }}
      >
        Back to today's compliment ☀️
      </Link>
    </div>
  )
}

function ProPitch({
  userId,
  authLoading,
  onRefresh,
}: {
  userId: string | null
  authLoading: boolean
  onRefresh: () => Promise<void> | void
}) {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshedNotice, setRefreshedNotice] = useState<string | null>(null)

  const doRefresh = async () => {
    setRefreshing(true)
    setRefreshedNotice(null)
    await onRefresh()
    setRefreshing(false)
    setRefreshedNotice(
      "We didn't find your purchase yet. Stripe usually delivers the receipt in 30 seconds — try again in a moment.",
    )
  }

  return (
    <div className="flex flex-col" style={{ gap: 20, paddingTop: 12 }}>
      <div className="flex flex-col items-center text-center" style={{ gap: 12 }}>
        <div
          className="font-mono inline-block"
          style={{
            fontSize: 10,
            letterSpacing: '.15em',
            textTransform: 'uppercase',
            background: 'rgba(245,200,66,.15)',
            color: 'var(--color-gold)',
            border: '1px solid rgba(245,200,66,.30)',
            borderRadius: 20,
            padding: '4px 12px',
          }}
        >
          ✦ OneC🌻mpliment Pro
        </div>
        <h1
          className="font-bold"
          style={{ fontSize: 'clamp(28px,6vw,38px)', lineHeight: 1.15 }}
        >
          Take your streak to the next level.
        </h1>
        <div style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.7, maxWidth: 380 }}>
          OneCompliment is free forever for individuals. Pro adds the safety net that makes a long
          streak survivable.
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {FEATURES.map((f) => (
          <FeatureCard key={f.name} {...f} />
        ))}
      </div>

      <div
        className="flex flex-col gap-2"
        style={{
          background: 'rgba(245,200,66,.07)',
          border: '1px solid rgba(245,200,66,.22)',
          borderRadius: 20,
          padding: 22,
          marginTop: 8,
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: 'var(--faint)',
            textAlign: 'center',
          }}
        >
          Pick a plan
        </div>
        {/* Checkout links only render once the session has a userId —
            without it the Stripe URL carries no client_reference_id, the
            webhook can't match the payment to a profile, and the user is
            charged with nothing activated. */}
        {userId ? (
          <>
            <a
              href={withProRef(getProStripeUrl('annual'), userId)}
              target="_blank"
              rel="noopener noreferrer"
              className="oc-btn flex items-center justify-center"
              style={{
                textDecoration: 'none',
                textAlign: 'center',
                gap: 8,
              }}
            >
              $29.99 / year — save 37% ✦
            </a>
            <a
              href={withProRef(getProStripeUrl('monthly'), userId)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'none',
                border: '1px solid rgba(245,200,66,.35)',
                borderRadius: 14,
                padding: 14,
                fontSize: 14,
                color: 'var(--color-gold)',
                textDecoration: 'none',
                display: 'block',
                textAlign: 'center',
              }}
            >
              $3.99 / month
            </a>
            <div
              className="font-mono text-center"
              style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}
            >
              Cancel anytime · Secure checkout via Stripe
            </div>
          </>
        ) : authLoading ? (
          <>
            <div
              className="oc-btn flex items-center justify-center"
              aria-disabled="true"
              style={{ textAlign: 'center', gap: 8, opacity: 0.5, cursor: 'wait' }}
            >
              $29.99 / year — save 37% ✦
            </div>
            <div
              aria-disabled="true"
              style={{
                background: 'none',
                border: '1px solid rgba(245,200,66,.35)',
                borderRadius: 14,
                padding: 14,
                fontSize: 14,
                color: 'var(--color-gold)',
                display: 'block',
                textAlign: 'center',
                opacity: 0.5,
                cursor: 'wait',
              }}
            >
              $3.99 / month
            </div>
            <div
              className="font-mono text-center"
              style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}
            >
              Preparing secure checkout…
            </div>
          </>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: '#FF6B6B',
              background: 'rgba(255,107,107,.08)',
              border: '1px solid rgba(255,107,107,.2)',
              borderRadius: 10,
              padding: '10px 12px',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            We couldn't connect your session, so checkout is paused — your purchase wouldn't get
            linked to your account. Refresh the page to try again.
          </div>
        )}
      </div>

      {/* Post-checkout: webhook can take a few seconds to flip the flag.
          Give the user a way to nudge it without a hard reload. */}
      <button
        onClick={doRefresh}
        disabled={refreshing}
        className="oc-btn-ghost"
      >
        {refreshing ? 'Checking…' : 'I just paid — refresh my Pro status'}
      </button>
      {refreshedNotice && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--faint)',
            lineHeight: 1.65,
            textAlign: 'center',
          }}
        >
          {refreshedNotice}
        </div>
      )}

      <div
        className="text-center"
        style={{
          background: 'rgba(168,230,207,.06)',
          border: '1px solid rgba(168,230,207,.18)',
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 11,
            color: 'var(--faint)',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
          }}
        >
          Already paid in the app?
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--dim)',
            lineHeight: 1.65,
            marginTop: 6,
          }}
        >
          If you bought Pro on iOS or Android, link your email in Settings → Pro will follow you here.
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  emoji,
  name,
  tag,
  desc,
}: {
  emoji: string
  name: string
  tag: string
  desc: string
}) {
  return (
    <div
      className="flex flex-col gap-1.5"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span
          className="font-bold"
          style={{ fontSize: 14, color: 'var(--text)' }}
        >
          {name}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: 10,
            color: 'var(--color-gold)',
            background: 'rgba(245,200,66,.12)',
            borderRadius: 20,
            padding: '2px 8px',
            marginLeft: 'auto',
          }}
        >
          {tag}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6 }}>{desc}</div>
    </div>
  )
}

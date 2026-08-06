import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from './Brand'
import { type Challenge } from '../lib/data'
import type { StreakFreezeStatus } from '../lib/supabase'

type Props = {
  challenge: Challenge
  langFlag: string
  onOpenLang: () => void
  onPlay: () => void
  todayLabel: string
  isPro: boolean
  freezeStatus: StreakFreezeStatus | null
  onUseFreeze: () => Promise<
    | { ok: true; freezeDate: string }
    | { ok: false; error: string; nextAvailable?: string }
  >
  /** True when user_streaks.last_completed === today. One compliment per day,
   *  same rule mobile/WriteScreen enforces. Hides the play button. */
  bloomedToday: boolean
  streak: number
  /**
   * Today's compliment row (sender's submit) — drives the SEND IT TO X
   * card. When `recipientUserId` is null the recipient isn't on
   * OneCompliment yet, and we surface the share card so the user can
   * text them the public link. Mirrors mobile/LandingScreen. Per client
   * feedback (2026-05-14) this card lives on Home, not on a separate
   * Done page.
   */
  todayCompletion: {
    id: string
    body: string
    recipientName: string
    recipientId: string | null
  } | null
}

export function Landing({
  challenge,
  langFlag,
  onOpenLang,
  onPlay,
  todayLabel,
  isPro,
  freezeStatus,
  onUseFreeze,
  bloomedToday,
  streak,
  todayCompletion,
}: Props) {
  return (
    <>
      <div className="flex justify-between items-center">
        <Brand />
        <div className="flex items-center gap-2.5">
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--faint)',
            }}
          >
            {todayLabel}
          </div>
          <button onClick={onOpenLang} className="oc-settings-btn">
            <span>{langFlag}</span>
          </button>
        </div>
      </div>
      <div
        className="flex flex-col items-center text-center gap-4"
        style={{ padding: '16px 0 8px' }}
      >
        <div className="bob" style={{ fontSize: 72 }}>☀️</div>
        <div
          className="font-bold"
          style={{ fontSize: 'clamp(28px,7vw,36px)', lineHeight: 1.15 }}
        >
          One compliment.<br />Every day.
        </div>
        <div
          style={{
            fontSize: 16,
            color: 'var(--dim)',
            lineHeight: 1.7,
            maxWidth: 340,
          }}
        >
          A daily topic that makes the people around you feel seen.
        </div>
      </div>
      <div className="flex gap-2.5">
        <StatPill value="1" label="topic/day" />
        <StatPill value="☀️→🌻" label="your daily bloom" />
        <StatPill value="0" label="downloads needed" />
      </div>
      {/* Today's Topic — relabeled and the rule-hint line removed per
          design feedback (it was filler; the rule shows on the next
          screen anyway). */}
      <div className="oc-gold-card">
        <div className="oc-label">TODAY'S TOPIC</div>
        <div
          className="font-bold"
          style={{ fontSize: 20, color: 'var(--text)', lineHeight: 1.3, marginTop: 8 }}
        >
          {challenge.prompt}
        </div>
      </div>
      {bloomedToday ? (
        <BloomedToday streak={streak} />
      ) : (
        <button onClick={onPlay} className="oc-btn">
          Give Today's Compliment ☀️
        </button>
      )}
      {/* SEND IT TO X — post-submit share card. Shown for every
          recipient (registered or not) so the sender always has a
          single, consistent share surface on Home after they bloom.
          Mirrors mobile/LandingScreen.tsx. */}
      {bloomedToday
        && todayCompletion
        && todayCompletion.id && (
          <SendToCard
            recipientName={todayCompletion.recipientName || 'them'}
            completionId={todayCompletion.id}
            isRegistered={!!todayCompletion.recipientId}
          />
        )}
      <FreezePill isPro={isPro} status={freezeStatus} onUse={onUseFreeze} />
      <div
        style={{ textAlign: 'center', fontSize: 12, color: 'var(--faint)', marginTop: -12 }}
      >
        No account needed. Plays in your browser.
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, marginTop: -8 }}>
        <Link to="/privacy" style={{ color: 'var(--faint)', textDecoration: 'none' }}>
          Privacy Policy
        </Link>
      </div>
    </>
  )
}

function BloomedToday({ streak }: { streak: number }) {
  return (
    <div
      className="flex flex-col items-center text-center gap-2"
      style={{
        background: 'rgba(168,230,207,.07)',
        border: '1px solid rgba(168,230,207,.30)',
        borderRadius: 16,
        padding: '20px 22px',
      }}
    >
      <div style={{ fontSize: 40 }}>🌻</div>
      <div className="font-bold" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1.3 }}>
        You bloomed today.
      </div>
      <div style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.6, maxWidth: 280 }}>
        One compliment a day — and you already lifted someone. Come back tomorrow ☀️
      </div>
      {streak > 0 && (
        <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <span
            className="font-bold font-mono"
            style={{ fontSize: 22, color: 'var(--color-gold)', letterSpacing: '-.02em' }}
          >
            {streak}
          </span>
          <span style={{ fontSize: 11, color: 'var(--faint)' }}>
            day{streak !== 1 ? 's' : ''} streak
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Post-submit share card. Mirrors mobile/LandingScreen.tsx — same card
 * is shown whether the recipient is a registered OC user or a
 * free-form name the sender typed. The copy branches on `isRegistered`
 * so the title/sub don't claim the recipient "isn't on OC yet" when
 * they actually are. Tap the button → native share sheet on
 * mobile-web, falls back to clipboard copy on desktop.
 */
function SendToCard({
  recipientName,
  completionId,
  isRegistered,
}: {
  recipientName: string
  completionId: string
  isRegistered: boolean
}) {
  const [copied, setCopied] = useState(false)
  const publicUrl = `https://onecompliment.app/c/${completionId}`
  // Share message intentionally does NOT include the compliment body —
  // per design feedback the curiosity hook ("tap to see what they
  // said") is the primary signup driver, and showing the text inline
  // removes that incentive.
  const liftMessage =
    `${recipientName}, you've been lifted on OneCompliment 🌻\n\n` +
    `Tap to see what was said — and send one back:\n${publicUrl}`

  const send = async () => {
    if ('share' in navigator) {
      try {
        await navigator.share({ text: liftMessage })
        return
      } catch {
        /* user dismissed — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(liftMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* nothing more we can do */
    }
  }

  return (
    <div
      className="flex flex-col"
      style={{
        background: 'rgba(168,230,207,.10)',
        border: '1px solid rgba(168,230,207,.30)',
        borderRadius: 16,
        padding: 18,
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#A8E6CF',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        SEND IT TO {recipientName.toUpperCase()}
      </div>
      <div
        className="font-bold"
        style={{ fontSize: 17, color: 'var(--text)', textAlign: 'center', lineHeight: 1.4 }}
      >
        {isRegistered
          ? `Let ${recipientName} see it now.`
          : `${recipientName} isn't on OneCompliment yet — that's OK.`}
      </div>
      <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.55, textAlign: 'center' }}>
        {isRegistered
          ? `They'll see it in their app, but you can send the card directly so it lands sooner.`
          : `Send them this card yourself. When they tap the link they'll see who lifted them and what you said.`}
      </div>
      <div
        className="font-mono"
        style={{
          background: 'var(--surf)',
          border: '1px solid var(--bord)',
          borderRadius: 10,
          padding: 14,
          fontSize: 12,
          color: 'var(--dim)',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          marginTop: 4,
        }}
      >
        {liftMessage}
      </div>
      <button
        onClick={send}
        className="oc-btn"
        style={{
          background: '#A8E6CF',
          color: '#0C0C0C',
          borderRadius: 14,
          padding: '14px 0',
          marginTop: 4,
          fontWeight: 700,
        }}
      >
        🌻 Send to {recipientName}
      </button>
      {copied && (
        <div
          style={{
            fontSize: 12,
            color: '#A8E6CF',
            textAlign: 'center',
          }}
        >
          ✓ Copied — paste it into iMessage / WhatsApp / DMs.
        </div>
      )}
    </div>
  )
}

function FreezePill({
  isPro,
  status,
  onUse,
}: {
  isPro: boolean
  status: StreakFreezeStatus | null
  onUse: () => Promise<
    | { ok: true; freezeDate: string }
    | { ok: false; error: string; nextAvailable?: string }
  >
}) {
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Free users see a soft upsell. Pros see actionable state.
  // When the migration hasn't been applied (status === null) we hide.
  if (!status) {
    if (!isPro) {
      return (
        <Link
          to="/pro"
          className="text-center"
          style={{
            background: 'rgba(245,200,66,.07)',
            border: '1px solid rgba(245,200,66,.20)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--color-gold)',
            textDecoration: 'none',
            marginTop: -16,
          }}
        >
          ✦ Pro lets you freeze your streak once a week →
        </Link>
      )
    }
    return null
  }

  if (status.used_today) {
    return (
      <div
        className="text-center"
        style={{
          background: 'rgba(168,230,207,.07)',
          border: '1px solid rgba(168,230,207,.22)',
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 13,
          color: 'var(--color-green)',
          marginTop: -16,
        }}
      >
        🛡 Streak frozen for today — your streak survives.
      </div>
    )
  }

  if (!status.available && status.next_available) {
    const next = new Date(status.next_available + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
    return (
      <div
        className="text-center font-mono"
        style={{
          fontSize: 11,
          color: 'var(--faint)',
          marginTop: -16,
        }}
      >
        Streak Freeze recharges {next}
      </div>
    )
  }

  if (!isPro) {
    return (
      <Link
        to="/pro"
        className="text-center"
        style={{
          background: 'rgba(245,200,66,.07)',
          border: '1px solid rgba(245,200,66,.20)',
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 13,
          color: 'var(--color-gold)',
          textDecoration: 'none',
          marginTop: -16,
        }}
      >
        ✦ Pro lets you freeze your streak once a week →
      </Link>
    )
  }

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setBusy(true)
    setError(null)
    const result = await onUse()
    setBusy(false)
    setConfirming(false)
    if (!result.ok) {
      setError(
        result.error === 'pro_required'
          ? 'Pro required to use Streak Freeze.'
          : result.error === 'weekly_limit'
          ? 'You already used a freeze this week.'
          : result.error === 'not_needed'
          ? 'No freeze needed — today already counts toward your streak.'
          : result.error,
      )
    }
  }

  return (
    <div className="flex flex-col gap-2" style={{ marginTop: -16 }}>
      <button
        onClick={handleClick}
        disabled={busy}
        className="oc-btn-ghost"
        style={{
          background: confirming ? 'rgba(245,200,66,.10)' : 'none',
          borderColor: confirming ? 'rgba(245,200,66,.30)' : 'var(--bord)',
          color: confirming ? 'var(--color-gold)' : 'var(--dim)',
        }}
      >
        {busy
          ? 'Freezing…'
          : confirming
          ? '✦ Confirm — freeze today'
          : '🛡 Freeze today’s streak'}
      </button>
      {error && (
        <div
          style={{
            fontSize: 12,
            color: '#FF6B6B',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex-1 text-center"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
        padding: '14px 10px',
      }}
    >
      <div
        className="font-bold font-mono"
        style={{ fontSize: 22, color: 'var(--color-gold)' }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 5 }}>{label}</div>
    </div>
  )
}

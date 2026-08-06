import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from './Brand'
import {
  type Challenge,
  getDayOfYear,
  getNextMilestone,
} from '../lib/data'

type Props = {
  recipient: string
  response: string
  streak: number
  challenge: Challenge
  onPlayAgain: () => void
  /** UUID of the row created by complete_daily_prompt — drives the
   *  /c/<id> public share link for unregistered recipients. */
  completionId: string | null
  /** Set when the sender picked a registered user from search. When
   *  null, the recipient isn't on OneCompliment yet and we surface a
   *  prominent "send it yourself" share card. */
  recipientUserId: string | null
}

/**
 * Tight share text matching Joao's Slack mockup (compliment-share-card):
 *   OneC🌻mpliment — Day 118 🔥
 *
 *   Today: <prompt>
 *   "<response>"
 *
 *   🌻 ☀️
 *
 *   onecompliment.app — what would you say?
 *
 * Replaces an earlier multi-row grid that spammed the message at high
 * streaks. The single 🌻 ☀️ pair is the "did it today + still going"
 * indicator — same vibe as Wordle's distribution row but one line.
 */
function buildShare(challenge: Challenge, response: string): string {
  const day = getDayOfYear()
  // Guard against null / undefined / "null" string prompts. Falls back
  // to "today's challenge" so the share card never reads
  // "Today: null" — same defensive pattern as buildLiftMessage.
  const prompt = (challenge.prompt ?? '').toString().trim()
  const promptLine = prompt && !/^(null|undefined)$/i.test(prompt) ? prompt : "today's compliment"
  return (
    `OneC🌻mpliment — Day ${day} 🔥\n\n` +
    `Today: ${promptLine}\n` +
    `"${response}"\n\n` +
    `🌻 ☀️\n\n` +
    `onecompliment.app — what would you say?`
  )
}

/** Share message a sender pastes into iMessage / WhatsApp / DM when the
 *  recipient isn't on OneCompliment yet. Personal, not promotional —
 *  the link does the marketing on the landing page. */
function buildLiftMessage(recipient: string, response: string, link: string): string {
  return `${recipient}, you've been lifted 🌻\n\n"${response}"\n\nSee it & start your own:\n${link}`
}

export function Done({
  recipient,
  response,
  streak,
  challenge,
  onPlayAgain,
  completionId,
  recipientUserId,
}: Props) {
  const [liftCopied, setLiftCopied] = useState(false)
  const next = getNextMilestone(streak)
  const shareText = buildShare(challenge, response)
  const isUnregistered = recipientUserId === null
  const publicUrl = completionId ? `https://onecompliment.app/c/${completionId}` : null
  const liftMessage = publicUrl ? buildLiftMessage(recipient, response, publicUrl) : ''

  const sendLift = async () => {
    if (!liftMessage) return
    if ('share' in navigator) {
      try {
        await navigator.share({ text: liftMessage })
        return
      } catch {
        /* user dismissed — fall through to clipboard */
      }
    }
    await navigator.clipboard?.writeText(liftMessage).catch(() => {})
    setLiftCopied(true)
    setTimeout(() => setLiftCopied(false), 2200)
  }

  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ gap: 16, paddingTop: 20 }}
    >
      <div style={{ fontSize: 60 }}>🌻</div>
      <div className="font-bold" style={{ fontSize: 24, lineHeight: 1.2 }}>
        You lifted someone today.
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--dim)',
          lineHeight: 1.6,
          maxWidth: 280,
        }}
      >
        {recipient} got a little more light today — that's on you.
      </div>
      <div
        className="oc-gold-card"
        style={{ width: '100%', textAlign: 'left' }}
      >
        <div className="oc-label" style={{ marginBottom: 10 }}>WHAT YOU SAID</div>
        <div style={{ fontSize: 16, fontStyle: 'italic', lineHeight: 1.55 }}>
          "{response}"
        </div>
        <div
          style={{ fontSize: 12, color: 'var(--faint)', marginTop: 8 }}
        >
          — to {recipient}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 24 }}>🔥</span>
        <span
          className="font-bold"
          style={{
            fontSize: 46,
            color: 'var(--color-gold)',
            letterSpacing: '-.03em',
          }}
        >
          {streak}
        </span>
        <span style={{ fontSize: 12, color: 'var(--faint)' }}>
          day{streak !== 1 ? 's' : ''} streak
        </span>
      </div>
      {next && (
        <div
          className="flex items-center gap-3 w-full"
          style={{
            background: 'rgba(245,200,66,.06)',
            border: '1px solid rgba(245,200,66,.15)',
            borderRadius: 14,
            padding: '14px 16px',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 24 }}>{next.emoji}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {next.days - streak} more day{next.days - streak !== 1 ? 's' : ''} to {next.badge}
            </div>
            <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
              Come back tomorrow ☀️
            </div>
          </div>
        </div>
      )}

      {/* Lift-someone-not-yet-on-the-app share card. Only renders when
          the sender typed a free-form name (no recipient_id). The
          message is personal — they paste it into iMessage / WhatsApp /
          DMs and the recipient lands on /c/<id>. */}
      {isUnregistered && publicUrl && (
        <div
          className="flex flex-col gap-3 w-full"
          style={{
            background:
              'linear-gradient(135deg,rgba(168,230,207,.10),rgba(168,230,207,.04))',
            border: '1px solid rgba(168,230,207,.30)',
            borderRadius: 18,
            padding: 22,
          }}
        >
          <div
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '.20em',
              textTransform: 'uppercase',
              color: 'var(--color-green)',
              alignSelf: 'center',
            }}
          >
            Send it to {recipient}
          </div>
          <div
            className="font-bold text-center"
            style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1.3 }}
          >
            {recipient} isn't on OneCompliment yet — that's OK.
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--dim)',
              lineHeight: 1.65,
              textAlign: 'center',
            }}
          >
            Send them this card yourself. When they tap the link they'll see who
            lifted them and what you said.
          </div>
          <div
            style={{
              fontFamily: 'var(--font-share)',
              background: 'var(--surf)',
              border: '1px solid var(--bord)',
              borderRadius: 12,
              padding: 14,
              fontSize: 12,
              color: 'var(--dim)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.7,
              textAlign: 'left',
            }}
          >
            {liftMessage}
          </div>
          <button
            onClick={sendLift}
            className="oc-btn"
            style={{ background: 'var(--color-green)' }}
          >
            🌻 Send to {recipient}
          </button>
          {liftCopied && (
            <div
              className="font-bold text-center"
              style={{
                background: 'var(--color-green)',
                color: '#0C0C0C',
                borderRadius: 10,
                padding: 10,
                fontSize: 13,
              }}
            >
              ✓ Copied — paste it anywhere
            </div>
          )}
        </div>
      )}

      {/* Bloom preview — screenshot-only, no Share button below.
          Per client feedback, the visual share card is meant to be
          screenshotted and posted directly to social — adding a
          copy-text button below was redundant and made the section
          feel like two actions instead of one display element. */}
      <div className="flex flex-col gap-2.5 w-full">
        <div className="oc-label-dim">SHARE YOUR BLOOM</div>
        <div
          style={{
            fontFamily: 'var(--font-share)',
            background: 'var(--surf)',
            border: '1px solid var(--bord)',
            borderRadius: 16,
            padding: '28px 20px',
            fontSize: 14,
            color: 'var(--text)',
            whiteSpace: 'pre-wrap',
            lineHeight: 2,
            textAlign: 'center',
          }}
        >
          {shareText}
        </div>
      </div>

      {/* Pro CTA — tight banner, full pitch lives at /pro */}
      <Link
        to="/pro"
        className="flex flex-col gap-3 w-full text-center"
        style={{
          background:
            'linear-gradient(135deg,rgba(245,200,66,.12),rgba(245,180,66,.06))',
          border: '1px solid rgba(245,200,66,.35)',
          borderRadius: 20,
          padding: 22,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '.15em',
            textTransform: 'uppercase',
            background: 'rgba(245,200,66,.15)',
            color: 'var(--color-gold)',
            border: '1px solid rgba(245,200,66,.30)',
            borderRadius: 20,
            padding: '4px 12px',
            alignSelf: 'center',
          }}
        >
          ✦ OneC🌻mpliment Pro
        </div>
        <div
          className="font-bold"
          style={{ fontSize: 19, color: 'var(--text)', lineHeight: 1.3 }}
        >
          Streak Freeze · 365-day History
        </div>
        <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6 }}>
          From $3.99/month. Cancel anytime.
        </div>
        <div
          className="oc-btn"
          style={{ marginTop: 4 }}
        >
          Unlock Pro →
        </div>
      </Link>

      {/* App Banner */}
      <div
        className="flex flex-col gap-3.5 w-full text-center"
        style={{
          background:
            'linear-gradient(135deg,rgba(245,200,66,.10),rgba(168,230,207,.07))',
          border: '1px solid rgba(245,200,66,.22)',
          borderRadius: 20,
          padding: 24,
        }}
      >
        <div className="self-center">
          <Brand size={22} />
        </div>
        <div
          className="font-bold"
          style={{ fontSize: 20, color: 'var(--text)', lineHeight: 1.25 }}
        >
          Want to save your streak and play with friends?
        </div>
        <div style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.6 }}>
          The browser version is just the beginning. The app is where the real magic happens.
        </div>
        <div className="flex flex-col gap-2 text-left">
          {[
            '👥 Create groups with friends, family, or coworkers',
            "🔥 Group streaks — don't let your squad down",
            '🌻 See what everyone in your group said each day',
            '🏅 Milestone moments at 7, 30, and 100 days',
            '📋 Weekly squad recap every Sunday',
          ].map((line) => (
            <div
              key={line}
              className="flex items-center gap-2.5"
              style={{ fontSize: 14, color: 'var(--dim)' }}
            >
              {line}
            </div>
          ))}
        </div>
        <a
          href="#"
          className="oc-btn"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          🌻 Download OneC🌻mpliment — Free
        </a>
        <div
          className="font-mono"
          style={{ fontSize: 11, color: 'var(--faint)' }}
        >
          Available on iOS &amp; Android
        </div>
      </div>

      {/* For Teams */}
      <div
        className="flex flex-col gap-3 w-full text-center"
        style={{
          background: 'rgba(168,230,207,.07)',
          border: '1px solid rgba(168,230,207,.2)',
          borderRadius: 18,
          padding: 20,
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 13,
            color: 'var(--faint)',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
          }}
        >
          For Schools &amp; Organizations
        </div>
        <div
          className="font-bold"
          style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1.3 }}
        >
          Run this as a challenge with your whole team
        </div>
        <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6 }}>
          Teachers, coaches, HR teams, and churches use OneC🌻mpliment to run group kindness challenges.
        </div>
        <Link
          to="/business"
          style={{
            background: 'var(--color-green)',
            color: '#0C0C0C',
            borderRadius: 12,
            padding: '14px 20px',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            display: 'block',
            textAlign: 'center',
          }}
        >
          🏢 Learn more for teams →
        </Link>
      </div>
      <button onClick={onPlayAgain} className="oc-btn-ghost">Back to home ☀️</button>
      <div className="flex gap-3 justify-center flex-wrap">
        <Link to="/privacy" style={{ fontSize: 12, color: 'var(--faint)', textDecoration: 'none' }}>
          Privacy Policy
        </Link>
      </div>
    </div>
  )
}


import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { storage } from '../lib/storage'
import { LinkEmail } from './LinkEmail'
import { supabase, submitFeedback as sendFeedbackToServer } from '../lib/supabase'

type Props = {
  open: boolean
  onClose: () => void
  username: string | null
  email: string | null
  isAnonymous: boolean
  isPro: boolean
  /** Reload auth state after sign-in / sign-out / email link. */
  onAuthChange: () => void
  /** Optional initial view — Home passes 'link-email' when surfacing
   *  the sheet from a "link email required" path elsewhere in the UI
   *  (e.g. create-group, since the server requires an email). */
  initialView?: 'main' | 'link-email'
}

export function SettingsSheet({
  open,
  onClose,
  username,
  email,
  isAnonymous,
  isPro,
  onAuthChange,
  initialView = 'main',
}: Props) {
  const [notifEnabled, setNotifEnabled] = useState(storage.getNotifEnabled())
  const [notifTime, setNotifTime] = useState(storage.getNotifTime())
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackError, setFeedbackError] = useState(false)
  const [view, setView] = useState<'main' | 'link-email'>(initialView)

  // Re-sync the view when Home re-opens the sheet with a different
  // initial intent (e.g. create-group flow → 'link-email'). Only
  // jumps the view forward — closing the sheet doesn't snap back.
  useEffect(() => {
    if (open && initialView === 'link-email') setView('link-email')
  }, [open, initialView])

  if (!open) return null

  const signOut = async () => {
    if (!confirm('Sign out? Your data is saved to your account — sign in again with your email to restore it.')) return
    await supabase.auth.signOut()
    onAuthChange()
    onClose()
  }

  const ready = rating > 0 || comment.trim().length > 0
  const toggleNotif = () => {
    const next = !notifEnabled
    setNotifEnabled(next)
    storage.setNotifEnabled(next)
  }
  const onTimeChange = (v: string) => {
    setNotifTime(v)
    storage.setNotifTime(v)
  }
  // Sends to the app_feedback table (same as mobile). The old version
  // only wrote to localStorage — nothing ever reached the team.
  const submitFeedback = async () => {
    if (!ready || feedbackSending) return
    setFeedbackSending(true)
    setFeedbackError(false)
    const ok = await sendFeedbackToServer(rating, comment.trim())
    setFeedbackSending(false)
    if (!ok) {
      setFeedbackError(true)
      return
    }
    setSubmitted(true)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col gap-5"
        style={{
          background: '#161616',
          borderRadius: '24px 24px 0 0',
          padding: '16px 24px 52px',
          width: '100%',
          maxWidth: 480,
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: 'rgba(255,255,255,.2)',
            borderRadius: 99,
            alignSelf: 'center',
          }}
        />
        {view === 'link-email' ? (
          <LinkEmail
            initialEmail={email}
            onClose={() => {
              setView('main')
              onAuthChange()
            }}
            onLinked={onAuthChange}
          />
        ) : (
        <>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#F2EDE4' }}>Settings</div>
        <div
          className="flex items-center justify-between"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F2EDE4' }}>
                {username ? `@${username}` : 'OneC🌻mpliment'}
              </span>
              {isPro && (
                <span
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: '.15em',
                    textTransform: 'uppercase',
                    background: 'rgba(245,200,66,.15)',
                    color: 'var(--color-gold)',
                    border: '1px solid rgba(245,200,66,.30)',
                    borderRadius: 20,
                    padding: '2px 8px',
                  }}
                >
                  ✦ Pro
                </span>
              )}
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                color: 'rgba(242,237,228,0.5)',
                marginTop: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {email
                ? email
                : isAnonymous
                ? 'Browser session · No email linked yet'
                : 'Signed in'}
            </div>
          </div>
          <button
            onClick={() => setView('link-email')}
            style={{
              background: email ? 'none' : 'var(--color-gold)',
              color: email ? 'var(--color-gold)' : '#0C0C0C',
              border: email ? '1px solid rgba(245,200,66,.30)' : 'none',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            {email ? 'Change' : 'Link email'}
          </button>
        </div>

        {/* Quick links */}
        <div className="flex flex-col gap-2">
          <Link
            to="/history"
            onClick={onClose}
            className="flex items-center justify-between"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '14px 16px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span style={{ fontSize: 18 }}>📖</span>
              <div>
                <div style={{ fontSize: 14, color: '#F2EDE4' }}>Recap</div>
                <div
                  className="font-mono"
                  style={{ fontSize: 11, color: 'rgba(242,237,228,0.5)', marginTop: 3 }}
                >
                  Compliments sent &amp; received
                </div>
              </div>
            </div>
            <span style={{ fontSize: 18, color: 'var(--faint)' }}>→</span>
          </Link>
          <Link
            to="/local"
            onClick={onClose}
            className="flex items-center justify-between"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '14px 16px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span style={{ fontSize: 18 }}>📍</span>
              <div>
                <div style={{ fontSize: 14, color: '#F2EDE4' }}>Local Leaderboard</div>
                <div
                  className="font-mono"
                  style={{ fontSize: 11, color: 'rgba(242,237,228,0.5)', marginTop: 3 }}
                >
                  Top streaks near you
                </div>
              </div>
            </div>
            <span style={{ fontSize: 18, color: 'var(--faint)' }}>→</span>
          </Link>
          {!isPro && (
            <Link
              to="/pro"
              onClick={onClose}
              className="flex items-center justify-between"
              style={{
                background: 'rgba(245,200,66,.07)',
                border: '1px solid rgba(245,200,66,.22)',
                borderRadius: 14,
                padding: '14px 16px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div className="flex items-center gap-2.5">
                <span style={{ fontSize: 18 }}>✦</span>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--color-gold)', fontWeight: 700 }}>
                    Get OneC🌻mpliment Pro
                  </div>
                  <div
                    className="font-mono"
                    style={{ fontSize: 11, color: 'rgba(242,237,228,0.5)', marginTop: 3 }}
                  >
                    Streak Freeze · 365-day history
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 18, color: 'var(--color-gold)' }}>→</span>
            </Link>
          )}
        </div>

        {/* Notifications */}
        <div className="flex flex-col gap-2.5">
          <div
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.2em',
              color: 'rgba(242,237,228,0.5)',
              textTransform: 'uppercase',
            }}
          >
            Daily Reminder
          </div>
          <div
            className="flex items-center justify-between"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '14px 16px',
            }}
          >
            <div>
              <div style={{ fontSize: 14, color: '#F2EDE4' }}>Remind me daily</div>
              <div
                className="font-mono"
                style={{ fontSize: 11, color: 'rgba(242,237,228,0.5)', marginTop: 3 }}
              >
                One nudge. That's it.
              </div>
            </div>
            <div
              onClick={toggleNotif}
              style={{
                width: 44,
                height: 26,
                borderRadius: 99,
                background: notifEnabled ? '#F5C842' : 'rgba(255,255,255,0.1)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 3,
                  left: notifEnabled ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: notifEnabled ? '#0D0D0D' : 'rgba(255,255,255,0.4)',
                  transition: 'left 0.2s',
                }}
              />
            </div>
          </div>
          {notifEnabled && (
            <div
              className="flex items-center gap-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--dim)', flex: 1 }}>Remind me at</div>
              <input
                type="time"
                value={notifTime}
                onChange={(e) => onTimeChange(e.target.value)}
                className="font-mono"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 15,
                  color: 'var(--text)',
                  outline: 'none',
                  cursor: 'pointer',
                  width: 'auto',
                }}
              />
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="flex flex-col gap-3">
          <div
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.2em',
              color: 'rgba(242,237,228,0.5)',
              textTransform: 'uppercase',
            }}
          >
            Share Your Feedback
          </div>
          {!submitted ? (
            <div className="flex flex-col gap-3">
              <div style={{ fontSize: 13, color: 'rgba(242,237,228,0.65)' }}>
                How would you rate OneC🌻mpliment?
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    onClick={() => setRating(n)}
                    style={{
                      fontSize: 32,
                      cursor: 'pointer',
                      opacity: n <= rating ? 1 : 0.25,
                      transform: n <= rating ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.15s',
                    }}
                  >
                    ⭐
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(242,237,228,0.65)' }}>
                What's working? What could be better?
              </div>
              <textarea
                rows={4}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what you think — we read everything."
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  fontSize: 14,
                  color: '#F2EDE4',
                  fontFamily: 'var(--font-serif)',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'none',
                  lineHeight: 1.6,
                }}
              />
              <div
                className="font-mono"
                style={{
                  fontSize: 11,
                  color: 'rgba(242,237,228,0.45)',
                  textAlign: 'right',
                }}
              >
                {comment.length}/500
              </div>
              {feedbackError && (
                <div
                  style={{
                    fontSize: 13,
                    color: '#FF6B6B',
                    background: 'rgba(255,107,107,.08)',
                    border: '1px solid rgba(255,107,107,.2)',
                    borderRadius: 10,
                    padding: '10px 12px',
                  }}
                >
                  Couldn't send your feedback — check your connection and try again.
                </div>
              )}
              <button
                onClick={submitFeedback}
                disabled={feedbackSending}
                style={{
                  background: ready ? '#F5C842' : 'rgba(255,255,255,0.08)',
                  color: ready ? '#0C0C0C' : 'rgba(245,240,232,0.3)',
                  border: 'none',
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: 'var(--font-serif)',
                  cursor: ready && !feedbackSending ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
              >
                {feedbackSending ? 'Sending…' : 'Send Feedback'}
              </button>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(168,230,207,0.1)',
                border: '1px solid rgba(168,230,207,0.2)',
                borderRadius: 14,
                padding: 18,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🌻</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#A8E6CF' }}>Thank you!</div>
              <div style={{ fontSize: 13, color: 'var(--faint)', marginTop: 4 }}>
                Your feedback helps us grow.
              </div>
            </div>
          )}
        </div>

        {!isAnonymous && (
          <button
            onClick={signOut}
            style={{
              background: 'none',
              border: '1px solid rgba(255,107,107,.18)',
              borderRadius: 14,
              padding: 14,
              fontSize: 14,
              color: 'rgba(255,107,107,.65)',
              fontFamily: 'var(--font-serif)',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 14,
            padding: 14,
            fontSize: 14,
            color: 'rgba(242,237,228,0.6)',
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
        </>
        )}
      </div>
    </div>
  )
}

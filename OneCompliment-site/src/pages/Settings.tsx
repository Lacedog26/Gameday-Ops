import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { BottomNav } from '../components/BottomNav'
import { LinkEmail } from '../components/LinkEmail'
import { EditProfile } from '../components/EditProfile'
import { WebPushToggle } from '../components/WebPushToggle'
import { useAuth } from '../hooks/useAuth'
import { useProStatus } from '../hooks/useProStatus'
import { storage } from '../lib/storage'
import { supabase, submitFeedback as sendFeedbackToServer } from '../lib/supabase'

/**
 * Full-page Settings — replaces the old bottom-sheet modal. All the
 * same content (account row, link-email flow, notifications, feedback,
 * sign out) but laid out for full-page use with the standard nav chrome
 * around it. Mirrors mobile/SettingsScreen which is also a full screen.
 *
 * Reads `?view=link-email` from the URL so other surfaces (e.g.
 * create-group, which requires an email) can deep-link the user
 * straight into the OTP flow.
 */
export default function Settings() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { isPro } = useProStatus(!auth.loading && !!auth.userId)

  const paramView = params.get('view')
  const paramEmail = params.get('email')
  const paramVerify = params.get('verify') === '1'
  const initialView: 'main' | 'link-email' | 'edit-profile' =
    paramView === 'link-email' ? 'link-email' : paramView === 'edit-profile' ? 'edit-profile' : 'main'
  const [view, setView] = useState<'main' | 'link-email' | 'edit-profile'>(initialView)

  // Local-only prefs (notifications, feedback)
  const [notifEnabled, setNotifEnabled] = useState(storage.getNotifEnabled())
  const [notifTime, setNotifTime] = useState(storage.getNotifTime())
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackError, setFeedbackError] = useState(false)

  // Re-sync the view if the URL changes (e.g. user navigates within
  // settings via a deep-link). Only jumps the view forward — closing
  // a sub-view goes back to main even if the URL still has it.
  useEffect(() => {
    if (initialView !== 'main') setView(initialView)
  }, [initialView])

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
  // only wrote to localStorage — nothing ever reached the team — while
  // Support promised "it lands in our inbox".
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
  const signOut = async () => {
    if (
      !confirm(
        'Sign out? Your data is saved to your account — sign in again with your email to restore it.',
      )
    )
      return
    await supabase.auth.signOut()
    auth.refresh()
    navigate('/')
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

      <main className="oc-wrap" style={{ paddingTop: 24, paddingBottom: 96 }}>
        <div className="flex flex-col gap-5">
          {view === 'link-email' ? (
            <LinkEmail
              // When deep-linked from UsernameRequiredModal with ?email=&verify=1,
              // start at the verify step with the email pre-filled (mobile parity).
              // Otherwise fall back to the user's already-linked email (or none).
              initialEmail={paramVerify && paramEmail ? paramEmail : auth.email}
              autoVerify={paramVerify && !!paramEmail}
              onClose={() => {
                // Deep-link entry path closes back to home (parity with
                // mobile's popToTop after verify); manual entry returns to
                // the Settings main view.
                if (paramVerify && paramEmail) {
                  navigate('/', { replace: true })
                } else {
                  setView('main')
                  auth.refresh()
                }
              }}
              onLinked={() => {
                auth.refresh()
                // Auto-route to home for the deep-link path so the user
                // lands on Home with their restored streak/data visible,
                // instead of being stranded on the Settings "Email linked"
                // confirmation. Mirrors mobile's popToTop in autoVerify.
                if (paramVerify && paramEmail) {
                  navigate('/', { replace: true })
                }
              }}
            />
          ) : view === 'edit-profile' ? (
            <EditProfile
              initialUsername={auth.username}
              email={auth.email}
              onClose={() => {
                setView('main')
                auth.refresh()
              }}
              onSaved={() => {
                auth.refresh()
              }}
            />
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#F2EDE4' }}>Settings</div>

              {/* Account row */}
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
                      {auth.username ? `@${auth.username}` : 'OneC🌻mpliment'}
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
                    {auth.email
                      ? auth.email
                      : auth.isAnonymous
                      ? 'Browser session · No email linked yet'
                      : 'Signed in'}
                  </div>
                </div>
                <button
                  onClick={() => setView('link-email')}
                  style={{
                    background: auth.email ? 'none' : 'var(--color-gold)',
                    color: auth.email ? 'var(--color-gold)' : '#0C0C0C',
                    border: auth.email ? '1px solid rgba(245,200,66,.30)' : 'none',
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
                  {auth.email ? 'Change' : 'Link email'}
                </button>
              </div>

              {/* Edit profile — sets the @username members see in groups,
                  teams, and on compliments. Mirrors mobile/EditProfileScreen. */}
              <button
                onClick={() => setView('edit-profile')}
                className="flex items-center justify-between"
                style={{
                  background: auth.username ? 'rgba(255,255,255,0.03)' : 'rgba(245,200,66,.07)',
                  border: auth.username
                    ? '1px solid rgba(255,255,255,0.07)'
                    : '1px solid rgba(245,200,66,.22)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span style={{ fontSize: 18 }}>👤</span>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        color: auth.username ? '#F2EDE4' : 'var(--color-gold)',
                        fontWeight: auth.username ? 400 : 700,
                      }}
                    >
                      {auth.username ? 'Edit profile' : 'Pick a username'}
                    </div>
                    <div
                      className="font-mono"
                      style={{ fontSize: 11, color: 'rgba(242,237,228,0.5)', marginTop: 3 }}
                    >
                      {auth.username
                        ? `Currently @${auth.username}`
                        : "What other members will see — required for groups & teams"}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 18,
                    color: auth.username ? 'var(--faint)' : 'var(--color-gold)',
                  }}
                >
                  →
                </span>
              </button>

              {/* Quick links */}
              <div className="flex flex-col gap-2">
                {/* <Link
                  to="/history"
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
                </Link> */}
                {!isPro && (
                  <Link
                    to="/pro"
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

              {/* Local Leaderboard — mirrors mobile/SettingsScreen's
                  "Local Leaderboard" section. /local renders the same
                  geo-leaderboard UI as the mobile GeoLeaderboardScreen. */}
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
                  Local Leaderboard
                </div>
                <Link
                  to="/local"
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
              </div>

              {/* Web push notifications — independent toggle from the
                  local daily reminder below. Subscribes the browser to a
                  service worker push channel; backend Edge Function fans
                  out on every received compliment. */}
              <WebPushToggle />

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
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#A8E6CF' }}>
                      Thank you!
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--faint)', marginTop: 4 }}>
                      Your feedback helps us grow.
                    </div>
                  </div>
                )}
              </div>

              {!auth.isAnonymous && (
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

              {/* Legal / about footer links */}
              <div
                className="flex flex-wrap justify-center"
                style={{
                  gap: 10,
                  paddingTop: 12,
                  marginTop: 4,
                  borderTop: '1px solid var(--bord)',
                }}
              >
                <Link to="/about" style={{ fontSize: 12, color: 'var(--faint)', textDecoration: 'none' }}>
                  About
                </Link>
                <span style={{ fontSize: 12, color: 'var(--faint)' }}>·</span>
                <Link to="/contact" style={{ fontSize: 12, color: 'var(--faint)', textDecoration: 'none' }}>
                  Contact
                </Link>
                <span style={{ fontSize: 12, color: 'var(--faint)' }}>·</span>
                <Link to="/privacy" style={{ fontSize: 12, color: 'var(--faint)', textDecoration: 'none' }}>
                  Privacy
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <BottomNav
        activeTab="settings"
        onHome={() => navigate('/?go=home')}
        onGroups={() => navigate('/?go=groups')}
        onTeams={() => navigate('/?go=teams')}
        onSettings={() => {
          /* already here */
        }}
      />
    </>
  )
}

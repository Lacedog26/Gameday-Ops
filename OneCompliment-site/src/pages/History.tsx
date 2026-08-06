import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { BottomNav } from '../components/BottomNav'
import { useAuth } from '../hooks/useAuth'
import { useProStatus } from '../hooks/useProStatus'
import {
  loadComplimentHistory,
  loadMyStreak,
  loadReceivedCompliments,
  getHistoryGateInfo,
  type MyStreak,
  type SentCompliment,
  type ReceivedCompliment,
  type HistoryGateInfo,
} from '../lib/supabase'
import {
  useReceivedComplimentsRealtime,
  useSentComplimentsRealtime,
} from '../hooks/useRealtime'
import { useGroups } from '../hooks/useGroups'
import { clearUnread } from '../lib/unreadReceived'
import { todayLocal, localDateString } from '../lib/dates'
import {
  getChallenge,
  getNextMilestone,
  MILESTONES,
} from '../lib/data'

const FREE_LOOKBACK_DAYS = 7
const PRO_LOOKBACK_DAYS = 365

type Tab = 'sent' | 'received'

export default function History() {
  const auth = useAuth()
  const navigate = useNavigate()
  const { isPro } = useProStatus(!auth.loading && !!auth.userId)
  const { groups } = useGroups(!auth.loading && !!auth.userId)
  const [tab, setTab] = useState<Tab>('sent')
  const [sent, setSent] = useState<SentCompliment[]>([])
  const [received, setReceived] = useState<ReceivedCompliment[]>([])
  const [streak, setStreak] = useState<MyStreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // Hidden-entry counts from the server. The history RPCs now clamp the
  // lookback by tier server-side (free clients never receive the gated
  // archive), so the ProGate count comes from get_history_gate_info
  // instead of diffing the fetch against the render filter.
  const [gateInfo, setGateInfo] = useState<HistoryGateInfo | null>(null)

  const loadAll = useCallback(async () => {
    const [s, r, str, gate] = await Promise.all([
      loadComplimentHistory(PRO_LOOKBACK_DAYS),
      loadReceivedCompliments(PRO_LOOKBACK_DAYS),
      loadMyStreak(),
      getHistoryGateInfo(),
    ])
    setSent(s)
    setReceived(r)
    setStreak(str)
    setGateInfo(gate)
  }, [])

  useEffect(() => {
    if (auth.loading || !auth.userId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [s, r, str, gate] = await Promise.all([
        loadComplimentHistory(PRO_LOOKBACK_DAYS),
        loadReceivedCompliments(PRO_LOOKBACK_DAYS),
        loadMyStreak(),
        getHistoryGateInfo(),
      ])
      if (!cancelled) {
        setSent(s)
        setReceived(r)
        setStreak(str)
        setGateInfo(gate)
        setLoading(false)
        // Viewing the Recap page = the user has now seen their received
        // compliments. Flip them read server-side and clear the nav dot.
        void clearUnread()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [auth.loading, auth.userId])

  // Reload on focus / tab visibility — covers "submit on Landing → click
  // History tab" where the route was already mounted in another window.
  useEffect(() => {
    if (auth.loading || !auth.userId) return
    const onFocus = () => {
      loadAll()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [auth.loading, auth.userId, loadAll])

  // Live: realtime INSERTs on completions filtered by user_id (sent) +
  // recipient_name (received). Either way, we just refetch the relevant
  // half; debouncing is unnecessary at the volume of personal use.
  useSentComplimentsRealtime(auth.userId, async () => {
    const s = await loadComplimentHistory(PRO_LOOKBACK_DAYS)
    setSent(s)
  })
  useReceivedComplimentsRealtime(auth.username, async () => {
    const r = await loadReceivedCompliments(PRO_LOOKBACK_DAYS)
    setReceived(r)
    // A compliment arrived while they're already on Recap — keep it marked
    // read so the dot doesn't flash on a page they're actively viewing.
    void clearUnread()
  })

  const manualRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }

  const cutoff = isPro ? null : daysAgo(FREE_LOOKBACK_DAYS)
  const visibleSent = cutoff ? sent.filter((c) => c.createdAt >= cutoff) : sent
  const visibleReceived = cutoff ? received.filter((c) => c.createdAt >= cutoff) : received

  const list = tab === 'sent' ? visibleSent : visibleReceived
  // Hidden counts come from the server (gated rows never arrive). The
  // fetch-vs-render diff stays as a fallback for the window between
  // client rollout and the 20260617 migration being applied.
  const fullCount = tab === 'sent' ? sent.length : received.length
  const localHidden = fullCount - list.length
  const hiddenCount = gateInfo && !gateInfo.is_pro
    ? (tab === 'sent' ? gateInfo.hidden_sent : gateInfo.hidden_received)
    : localHidden

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

      <main className="oc-wrap" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div className="flex flex-col" style={{ gap: 16 }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 32 }}>📖</span>
            <div>
              <div className="oc-label">RECAP</div>
              <h1
                className="font-bold"
                style={{ fontSize: 'clamp(24px,5vw,32px)', lineHeight: 1.2, marginTop: 4 }}
              >
                Every word you've written.
              </h1>
            </div>
          </div>

          {/* TODAY status — same shape as mobile RecapScreen */}
          <TodayCard streak={streak} />

          {/* YOUR STREAK — number + bloom grid + progress to next milestone */}
          <StreakCard streak={streak} />

          {/* MILESTONES — only achieved ones */}
          <MilestonesCard streak={streak?.effective_streak ?? 0} />

          {/* GROUP ACTIVITY */}
          <GroupActivityCard groups={groups} />

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1.5">
              <TabBtn label="Sent" active={tab === 'sent'} count={visibleSent.length} onClick={() => setTab('sent')} />
              <TabBtn
                label="Received"
                active={tab === 'received'}
                count={visibleReceived.length}
                onClick={() => setTab('received')}
              />
            </div>
            <button
              onClick={manualRefresh}
              disabled={refreshing}
              style={{
                background: 'none',
                border: '1px solid var(--bord)',
                borderRadius: 99,
                padding: '6px 14px',
                fontSize: 12,
                color: 'var(--faint)',
                fontFamily: 'var(--font-serif)',
                cursor: refreshing ? 'default' : 'pointer',
              }}
            >
              {refreshing ? '↻ Refreshing…' : '↻ Refresh'}
            </button>
          </div>

          {loading ? (
            <Hint>Loading…</Hint>
          ) : list.length === 0 ? (
            <Hint>
              {tab === 'sent'
                ? "You haven't written a compliment yet. Today's compliment is one tap away."
                : "No compliments received yet. Once friends or teammates lift you, they'll appear here."}
            </Hint>
          ) : (
            <div className="flex flex-col gap-2.5">
              {tab === 'sent'
                ? visibleSent.map((c) => <SentCard key={c.id} item={c} />)
                : visibleReceived.map((c) => <ReceivedCard key={c.id} item={c} />)}
            </div>
          )}

          {!isPro && hiddenCount > 0 && (
            <ProGate hiddenCount={hiddenCount} />
          )}

          {!isPro && list.length > 0 && hiddenCount === 0 && (
            <ProTeaser />
          )}
        </div>
      </main>
      <BottomNav
        onHome={() => navigate('/?go=home')}
        onGroups={() => navigate('/?go=groups')}
        onTeams={() => navigate('/?go=teams')}
        /* onSettings omitted — falls through to the /settings route Link. */
      />
      {/* Make room above the fixed nav so the last entry isn't covered. */}
      <div style={{ height: 96 }} />
    </>
  )
}

function TabBtn({
  label,
  active,
  count,
  onClick,
}: {
  label: string
  active: boolean
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(245,200,66,.12)' : 'var(--surf)',
        color: active ? 'var(--color-gold)' : 'var(--dim)',
        border: `1px solid ${active ? 'rgba(245,200,66,.35)' : 'var(--bord)'}`,
        borderRadius: 99,
        padding: '6px 14px',
        fontSize: 13,
        fontFamily: 'var(--font-serif)',
        fontWeight: active ? 700 : 400,
        cursor: 'pointer',
      }}
    >
      {label} <span style={{ opacity: 0.6 }}>· {count}</span>
    </button>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-center"
      style={{
        padding: '32px 16px',
        color: 'var(--faint)',
        fontSize: 14,
        lineHeight: 1.6,
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
      }}
    >
      {children}
    </div>
  )
}

/** Read receipt for the sender: Read (recipient viewed it), Delivered
 *  (landed in their account, not yet viewed), Sent (no account matched
 *  yet — store-and-claim pending). Flips live via the sent realtime hook
 *  when the recipient opens Recap or the compliment view. */
function readStatus(item: SentCompliment): { label: string; color: string } {
  if (item.isRead) return { label: '✓✓ Read', color: 'var(--color-gold)' }
  if (item.recipientId) return { label: '✓ Delivered', color: 'var(--color-green)' }
  return { label: 'Sent', color: 'var(--faint)' }
}

function SentCard({ item }: { item: SentCompliment }) {
  const status = readStatus(item)
  return (
    <div
      className="flex flex-col gap-2"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          to {item.recipient || 'someone'}
        </span>
        <span className="flex items-center" style={{ gap: 8 }}>
          <span className="font-mono" style={{ fontSize: 10, color: status.color }}>
            {status.label}
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 10, color: 'var(--faint)' }}
          >
            {formatDate(item.date)}
          </span>
        </span>
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--dim)',
          fontStyle: 'italic',
          lineHeight: 1.6,
          paddingLeft: 12,
          borderLeft: '2px solid rgba(245,200,66,.3)',
        }}
      >
        "{item.body}"
      </div>
    </div>
  )
}

function ReceivedCard({ item }: { item: ReceivedCompliment }) {
  return (
    <div
      className="flex flex-col gap-2"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          from @{item.senderUsername}
          {item.contextName && (
            <span
              style={{ color: 'var(--faint)', fontWeight: 400 }}
            >
              {' '}
              · {item.source} · {item.contextName}
            </span>
          )}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 10, color: 'var(--faint)' }}
        >
          {formatDate(item.date)}
        </span>
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--dim)',
          fontStyle: 'italic',
          lineHeight: 1.6,
          paddingLeft: 12,
          borderLeft: '2px solid rgba(168,230,207,.3)',
        }}
      >
        "{item.body}"
      </div>
    </div>
  )
}

function ProGate({ hiddenCount }: { hiddenCount: number }) {
  return (
    <Link
      to="/pro"
      className="flex flex-col gap-2 text-center"
      style={{
        background:
          'linear-gradient(135deg,rgba(245,200,66,.12),rgba(245,180,66,.06))',
        border: '1px solid rgba(245,200,66,.35)',
        borderRadius: 16,
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
        ✦ {hiddenCount} more compliment{hiddenCount !== 1 ? 's' : ''} with Pro
      </div>
      <div className="font-bold" style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.3 }}>
        Free shows {FREE_LOOKBACK_DAYS} days. Pro shows the full {PRO_LOOKBACK_DAYS}-day archive.
      </div>
      <div className="oc-btn" style={{ marginTop: 6 }}>
        Unlock Compliment History →
      </div>
    </Link>
  )
}

function ProTeaser() {
  return (
    <Link
      to="/pro"
      className="text-center"
      style={{
        background: 'rgba(168,230,207,.06)',
        border: '1px solid rgba(168,230,207,.18)',
        borderRadius: 14,
        padding: 16,
        textDecoration: 'none',
        color: 'inherit',
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
        Want a longer archive?
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--dim)',
          lineHeight: 1.65,
          marginTop: 6,
        }}
      >
        Pro saves every compliment for {PRO_LOOKBACK_DAYS} days. ✦
      </div>
    </Link>
  )
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const today = todayLocal()
  const yesterday = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return localDateString(d)
  })()
  if (iso === today) return 'Today'
  if (iso === yesterday) return 'Yesterday'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// ── Recap cards (mirroring mobile/RecapScreen) ────────────────

function Card({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col gap-3"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 16,
        padding: '16px 18px',
      }}
    >
      <div className="oc-label-dim">{label}</div>
      {children}
    </div>
  )
}

function TodayCard({ streak }: { streak: import('../lib/supabase').MyStreak | null }) {
  const today = todayLocal()
  const bloomedToday = streak?.last_completed === today
  const challenge = getChallenge()
  return (
    <Card label="TODAY">
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 36 }}>{bloomedToday ? '🌻' : '☀️'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>
            {bloomedToday ? 'You bloomed today!' : "You haven't bloomed yet"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--dim)',
              lineHeight: 1.5,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {challenge.prompt}
          </div>
        </div>
      </div>
    </Card>
  )
}

function StreakCard({ streak }: { streak: import('../lib/supabase').MyStreak | null }) {
  // Effective (freeze-aware) streak — 0 once a day was missed, so the bloom
  // grid + "next milestone" progress match reality instead of the stale
  // stored counter.
  const current = streak?.effective_streak ?? 0
  const nextMs = getNextMilestone(current)
  // Show up to 28 days of bloom — same as mobile.
  const total = Math.min(current, 28)
  const perRow = 7
  const rows: number[] = []
  for (let i = 0; i < total; i += perRow) rows.push(Math.min(perRow, total - i))
  const progressPct = nextMs ? Math.min((current / nextMs.days) * 100, 100) : 0
  return (
    <Card label="YOUR STREAK">
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 28 }}>🔥</span>
        <span
          className="font-bold font-mono"
          style={{
            fontSize: 38,
            color: 'var(--color-gold)',
            letterSpacing: '-.03em',
            lineHeight: 1,
          }}
        >
          {current}
        </span>
        <span style={{ fontSize: 13, color: 'var(--faint)', marginLeft: 4 }}>
          day{current !== 1 ? 's' : ''}
        </span>
        {streak?.longest_streak ? (
          <span
            className="font-mono"
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: 'var(--faint)',
            }}
          >
            best: {streak.longest_streak}
          </span>
        ) : null}
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-1">
          {rows.map((cells, ri) => (
            <div key={ri} className="flex gap-1">
              {Array.from({ length: cells }).map((_, ci) => (
                <span key={ci} style={{ fontSize: 18 }}>🌻</span>
              ))}
            </div>
          ))}
        </div>
      )}

      {nextMs && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 12, color: 'var(--dim)' }}>
              Next: {nextMs.emoji} {nextMs.badge}
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 11, color: 'var(--faint)' }}
            >
              {nextMs.days - current} day{nextMs.days - current !== 1 ? 's' : ''} left
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: 'rgba(255,255,255,.06)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: 'linear-gradient(to right, #F5C842, #FFB347)',
                transition: 'width .4s ease',
              }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}

function MilestonesCard({ streak }: { streak: number }) {
  const achieved = MILESTONES.filter((m) => m.days <= streak)
  if (achieved.length === 0) return null
  return (
    <Card label="MILESTONES">
      <div className="flex flex-col gap-2">
        {achieved.map((m) => (
          <div
            key={m.days}
            className="flex items-center gap-3"
            style={{
              background: `${m.color}10`,
              border: `1px solid ${m.color}33`,
              borderRadius: 12,
              padding: '10px 12px',
            }}
          >
            <span style={{ fontSize: 26 }}>{m.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="font-bold"
                style={{ fontSize: 13, color: 'var(--text)' }}
              >
                {m.badge}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--faint)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.title}
              </div>
            </div>
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                color: m.color,
                background: `${m.color}18`,
                border: `1px solid ${m.color}44`,
                borderRadius: 20,
                padding: '3px 10px',
              }}
            >
              {m.days}d
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function GroupActivityCard({ groups }: { groups: import('../lib/groups').GroupInfo[] }) {
  if (groups.length === 0) return null
  return (
    <Card label="GROUP ACTIVITY">
      <div className="flex flex-col gap-2">
        {groups.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,.025)',
              border: '1px solid var(--bord)',
              borderRadius: 12,
              padding: '10px 12px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="font-bold"
                style={{
                  fontSize: 14,
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {g.name}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}
              >
                {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                {g.my_role === 'admin' ? ' · admin' : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                className="font-mono"
                style={{ fontSize: 11, color: 'var(--color-gold)', letterSpacing: '.1em' }}
              >
                {g.invite_code}
              </div>
              <div
                style={{ fontSize: 9, color: 'var(--faint)', letterSpacing: '.1em' }}
              >
                INVITE
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

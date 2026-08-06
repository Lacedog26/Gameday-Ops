import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import {
  loadGeoLeaderboard,
  loadGeoLeaderboardSummary,
  setMyLocationShare,
  type GeoLeaderboardRow,
  type GeoLeaderboardScope,
  type GeoLeaderboardSummary,
} from '../lib/supabase'

const SCOPES: { key: GeoLeaderboardScope; label: string }[] = [
  { key: 'city',    label: 'My City' },
  { key: 'region',  label: 'State / Region' },
  { key: 'country', label: 'Country' },
]

export default function LocalLeaderboard() {
  const [scope, setScope]       = useState<GeoLeaderboardScope>('city')
  const [rows, setRows]         = useState<GeoLeaderboardRow[]>([])
  const [summary, setSummary]   = useState<GeoLeaderboardSummary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [savingShare, setSavingShare] = useState(false)

  const fetchAll = useCallback(async () => {
    const [s, lb] = await Promise.all([
      loadGeoLeaderboardSummary(),
      loadGeoLeaderboard(scope, 25),
    ])
    setSummary(s)
    setRows(lb)
  }, [scope])

  useEffect(() => {
    setLoading(true)
    fetchAll().finally(() => setLoading(false))
  }, [fetchAll])

  const onToggleShare = async () => {
    if (!summary) return
    const next = !summary.share
    setSavingShare(true)
    const ok = await setMyLocationShare(next)
    if (ok) setSummary({ ...summary, share: next })
    setSavingShare(false)
    fetchAll()
  }

  const rankLabel = (idx: number, streak: number) => {
    if (streak <= 0) return `#${idx + 1}`
    if (idx === 0) return '🥇'
    if (idx === 1) return '🥈'
    if (idx === 2) return '🥉'
    return `#${idx + 1}`
  }

  const scopeLabel: Record<GeoLeaderboardScope, string | undefined> = {
    city:    summary?.city,
    region:  summary?.region,
    country: summary?.country,
  }
  const scopeCount: Record<GeoLeaderboardScope, number | undefined> = {
    city:    summary?.city_count,
    region:  summary?.region_count,
    country: summary?.country_count,
  }

  return (
    <>
      <nav
        className="flex justify-between items-center"
        style={{
          position: 'sticky', top: 0, zIndex: 50,
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
            color: 'var(--faint)', fontSize: 13, textDecoration: 'none',
            border: '1px solid var(--bord)', borderRadius: 20, padding: '7px 14px',
          }}
        >
          ← Back to app
        </Link>
      </nav>

      <main className="oc-wrap" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div className="flex flex-col" style={{ gap: 18 }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 32 }}>📍</span>
            <div>
              <div className="oc-label">LOCAL LEADERBOARD</div>
              <h1
                className="font-bold"
                style={{ fontSize: 'clamp(24px,5vw,32px)', lineHeight: 1.2, marginTop: 4 }}
              >
                Top streaks near you
              </h1>
            </div>
          </div>

          <p style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.55 }}>
            Opt in below, then each compliment you post checks your IP once to detect your area —
            the IP is never stored.
          </p>

          {/* Sharing opt-in card — always rendered (once summary loads) so a
              user can opt in BEFORE we have a location for them. Capture is
              gated on this toggle server-side (update-my-location returns early
              when location_share is false), so the user must turn it on first;
              their next compliment then derives their area from the request IP.
              Mirrors the mobile GeoLeaderboardScreen. */}
          {!loading && summary && (
            <div
              className="flex items-center gap-3"
              style={{
                background: summary.share ? 'rgba(245,200,66,.06)' : 'var(--surf)',
                border: `1px solid ${summary.share ? 'rgba(245,200,66,.30)' : 'var(--bord)'}`,
                borderRadius: 14,
                padding: '14px 16px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  {summary.share
                    ? summary.has_location
                      ? "You're on the leaderboard"
                      : 'Local Leaderboard is on'
                    : 'Show me on the leaderboard'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 3, lineHeight: 1.5 }}>
                  {summary.share
                    ? summary.has_location
                      ? `Your name and streak are visible to people in ${summary.city ?? summary.country}.`
                      : "Post your next compliment — we'll derive your city from your IP and add you to the board."
                    : summary.has_location
                      ? `Currently hidden. Toggle on and people in ${summary.city ?? summary.country} can see your streak.`
                      : 'Off by default. Turn on and your next compliment will add you to the board.'}
                </div>
              </div>
              <button
                onClick={onToggleShare}
                disabled={savingShare}
                aria-label="Toggle leaderboard visibility"
                style={{
                  position: 'relative',
                  width: 48, height: 28, borderRadius: 14,
                  background: summary.share ? 'var(--color-gold)' : 'rgba(255,255,255,0.10)',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                  transition: 'background .15s',
                }}
              >
                <span
                  style={{
                    position: 'absolute', top: 3,
                    left: summary.share ? 23 : 3,
                    width: 22, height: 22, borderRadius: '50%',
                    background: summary.share ? '#0D0D0D' : 'rgba(255,255,255,0.4)',
                    transition: 'left .15s',
                  }}
                />
              </button>
            </div>
          )}

          {/* Opted in but no location yet — explain the next step. */}
          {!loading && summary?.share && !summary.has_location && (
            <Notice
              title="One more step"
              body="Post a compliment from your usual location and we'll detect your city from your IP. Only city / region / country is stored — never precise coordinates, never the IP itself."
            />
          )}

          {/* Scope tabs */}
          {summary?.has_location && (
            <div className="flex gap-2">
              {SCOPES.map(s => {
                const active = scope === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => setScope(s.key)}
                    style={{
                      flex: 1,
                      background: active ? 'rgba(245,200,66,.08)' : 'var(--surf)',
                      border: `1px solid ${active ? 'rgba(245,200,66,.30)' : 'var(--bord)'}`,
                      color: active ? 'var(--color-gold)' : 'var(--faint)',
                      borderRadius: 10, padding: '10px 8px',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                    {scopeCount[s.key] !== undefined && (
                      <span style={{ fontSize: 10, opacity: 0.85 }}>{scopeCount[s.key]}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {summary?.has_location && scopeLabel[scope] && (
            <div style={{ fontSize: 12, color: 'var(--faint)' }}>
              Showing:{' '}
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{scopeLabel[scope]}</span>
            </div>
          )}

          {/* Rows */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--faint)', fontSize: 13 }}>
              Loading…
            </div>
          ) : rows.length === 0 && summary?.has_location ? (
            <Notice
              body={
                summary.share
                  ? "No one in your area has opted in yet. You're first."
                  : 'No one in your area has opted in yet — including you. Toggle on above to start the leaderboard.'
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((m, idx) => {
                const isTop = idx < 3 && m.current_streak > 0
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-3"
                    style={{
                      background: isTop ? 'rgba(245,200,66,.06)' : 'var(--surf)',
                      border: `1px solid ${
                        m.is_me
                          ? 'var(--color-gold)'
                          : isTop
                          ? 'rgba(245,200,66,.30)'
                          : 'var(--bord)'
                      }`,
                      borderRadius: 12,
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        width: 32, textAlign: 'center',
                        fontSize: isTop ? 18 : 14,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: isTop ? 'var(--color-gold)' : 'var(--faint)',
                      }}
                    >
                      {rankLabel(idx, m.current_streak)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          {m.is_me ? 'You' : m.display_name ?? m.username ?? 'Anonymous'}
                        </span>
                        {m.is_me && (
                          <span
                            className="font-mono"
                            style={{
                              fontSize: 9, letterSpacing: '.1em',
                              color: 'var(--color-gold)',
                              background: 'rgba(245,200,66,.12)',
                              borderRadius: 4, padding: '2px 6px',
                            }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                        {m.location_city ?? m.location_region ?? m.location_country ?? ''}
                        {m.longest_streak > m.current_streak
                          ? ` · Best: ${m.longest_streak}d`
                          : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 16 }}>{m.bloomed_today ? '🌻' : '☀️'}</span>
                      <span
                        style={{
                          fontSize: 18, fontWeight: 700,
                          color: 'var(--color-gold)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {m.current_streak}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <p
            style={{
              fontSize: 11, color: 'var(--faint)', lineHeight: 1.55,
              textAlign: 'center', marginTop: 8,
            }}
          >
            Once you opt in, we detect your area from your IP after each compliment — only your
            most recent city is stored, never the IP itself. You're hidden from the leaderboard
            until you opt in above.
          </p>
        </div>
      </main>
    </>
  )
}

function Notice({ title, body }: { title?: string; body: string }) {
  return (
    <div
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      {title && (
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          {title}
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.55 }}>{body}</div>
    </div>
  )
}

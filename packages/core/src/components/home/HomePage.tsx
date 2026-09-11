import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDashboard } from '../../context/DashboardContext'
import { useAuth } from '../../context/AuthProvider'
import { useOrg } from '../../context/OrgProvider'
import { useNow } from '../../hooks/useNow'
import { getTeam, masterGames, applyOverride, productConfig } from '../../product'
import { resolveTeam } from '../../brand'
import { kickoffMs, formatCountdown, formatClock } from '../../lib/time'
import { supabase } from '../../lib/supabaseConfig'
import type { GameInfo, NflGame } from '../../types'
import TeamMonogram from '../common/TeamMonogram'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function fmtDate(date: string): string {
  if (!date) return 'Date TBD'
  const [y, m, d] = date.split('-').map(Number)
  const dow = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${dow}, ${MONTHS[m - 1]} ${d}`
}
function fmtTime(time: string): string {
  if (!time) return 'TBD'
  const [h, mm] = time.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  let hh = h % 12
  if (hh === 0) hh = 12
  return `${hh}:${String(mm).padStart(2, '0')} ${ap}`
}

/**
 * Home — the first screen after sign-in. Answers "what needs to happen for my
 * next game?" at a glance: the next game, a real readiness checklist computed
 * from actual app state, and the upcoming schedule. It is deliberately NOT the
 * schedule editor — the primary action opens Game Day Ops (the live board), and
 * everything else lives under Admin.
 */
export default function HomePage() {
  const { state, actions } = useDashboard()
  const { org } = useOrg()
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const now = useNow(1000)

  const team = resolveTeam(getTeam(state.game.teamId), state.teamBranding?.[state.game.teamId])
  const logo = state.teamLogos[team.id]?.url || team.assets.primaryLogoUrl
  const opp = state.game.opponentId ? getTeam(state.game.opponentId) : null
  const oppName = opp ? opp.name : state.game.opponent || 'Opponent TBD'

  // Schedule for this team+season: imported (custom) supersedes the shipped
  // master; overrides applied. Used for the upcoming-games list.
  const schedule = useMemo<NflGame[]>(() => {
    const master = masterGames(team.id, state.season)
    const custom = state.customGames.filter((g) => g.teamId === team.id && g.season === state.season)
    const base = custom.length ? custom : master
    return base
      .map((g) => applyOverride(g, state.gameOverrides[g.id]))
      .filter((g) => g.status !== 'bye')
      .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`))
  }, [team.id, state.season, state.customGames, state.gameOverrides])

  const todayISO = new Date().toISOString().slice(0, 10)
  const upcoming = useMemo(() => schedule.filter((g) => g.date && g.date >= todayISO), [schedule, todayISO])

  // Live kickoff countdown for the loaded game.
  const hasGame = Boolean(state.game.kickoffISO && (state.game.opponent || state.game.opponentId))
  const ko = hasGame ? kickoffMs(state.game) : NaN
  const secsToKick = Number.isNaN(ko) ? NaN : Math.max(0, Math.floor((ko - now) / 1000))

  // TV displays connected (real count from the org's displays).
  const [displayCount, setDisplayCount] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!supabase || !org) {
      setDisplayCount(null)
      return
    }
    supabase
      .from('displays')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .then(({ count }) => !cancelled && setDisplayCount(count ?? 0))
    return () => {
      cancelled = true
    }
  }, [org])

  // Readiness — computed from real state, never faked.
  const checks = [
    { label: 'Schedule loaded', ok: hasGame, fix: 'Import or select a game', required: true },
    { label: 'Kickoff confirmed', ok: hasGame && !!state.game.kickoffISO, fix: 'Set the kickoff time', required: true },
    { label: 'Timeline configured', ok: state.activeEvents.length > 0, fix: 'Build your pre-game timeline', required: true },
    { label: 'Team branding', ok: Boolean(logo || team.colors?.primary), fix: 'Add your logo & colors', required: false },
    {
      label: 'TV display connected',
      ok: displayCount == null ? true : displayCount > 0,
      fix: 'Add a TV display link',
      required: false,
    },
    { label: 'Alerts configured', ok: Boolean(state.settings), fix: 'Review alert settings', required: false },
  ]
  const requiredOk = checks.filter((c) => c.required).every((c) => c.ok)
  const allOk = checks.every((c) => c.ok)
  const status: 'ready' | 'action' | 'notready' = !hasGame ? 'notready' : allOk ? 'ready' : requiredOk ? 'ready' : 'action'

  const statusUi = {
    ready: { text: 'READY FOR GAME DAY', cls: 'text-alert-go border-alert-go/50 bg-alert-go/10' },
    action: { text: 'ACTION REQUIRED', cls: 'text-alert-warn border-alert-warn/50 bg-alert-warn/10' },
    notready: { text: 'NOT READY', cls: 'text-bills-red border-bills-red/50 bg-bills-red/10' },
  }[status]

  const loadGameToBoard = (g: NflGame) => {
    const o = g.opponentId ? getTeam(g.opponentId) : null
    const info: GameInfo = {
      teamId: g.teamId,
      opponentId: g.opponentId,
      opponent: o ? o.name : g.opponentName ?? '',
      week: g.weekLabel,
      homeAway: g.homeAway,
      kickoffISO: g.time ? `${g.date}T${g.time}` : `${g.date}T12:00`,
      timezone: g.timezone,
      venue: g.venue,
      sourceGameId: g.id,
    }
    actions.loadGame(info)
    nav('/board')
  }

  return (
    <div className="field-bg min-h-full w-full overflow-y-auto text-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-navy-950/95 px-4 py-3 backdrop-blur sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {logo ? (
            <img src={logo} alt={team.name} className="h-9 w-9 shrink-0 object-contain" />
          ) : (
            <TeamMonogram abbr={team.abbr} className="h-9 w-9 shrink-0" />
          )}
          <div className="min-w-0 leading-none">
            <div className="truncate font-display text-base font-extrabold uppercase tracking-wide sm:text-lg">
              {productConfig().productName}
            </div>
            <div className="text-[11px] font-semibold tracking-widest text-slate-400">GAME DAY OPERATIONS</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin"
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold tracking-wider text-slate-200 hover:bg-white/10 sm:px-4 sm:text-sm"
          >
            Admin
          </Link>
          {user && (
            <button
              onClick={() => signOut()}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold tracking-wider text-slate-200 hover:bg-white/10 sm:px-4 sm:text-sm"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6">
        {/* NEXT GAME hero */}
        <section className="rounded-2xl border border-white/10 bg-navy-950/60 p-5 sm:p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">
            {hasGame ? 'Next Game' : 'No game loaded'}
          </div>
          {hasGame ? (
            <>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-3xl font-extrabold sm:text-4xl">{team.shortName}</span>
                <span className="font-display text-lg font-bold text-slate-400">
                  {state.game.homeAway === 'HOME' ? 'vs' : 'at'}
                </span>
                <span className="font-display text-3xl font-extrabold sm:text-4xl">{oppName}</span>
              </div>
              <div className="mt-1 text-slate-300">
                {state.game.week ? `${state.game.week} · ` : ''}
                {state.game.kickoffISO
                  ? `${fmtDate(state.game.kickoffISO.slice(0, 10))} · ${formatClock(ko)}`
                  : 'Date & kickoff TBD'}
                {state.game.venue ? ` · ${state.game.venue}` : ''}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Kickoff in</div>
                  <div className="tnum font-display text-4xl font-extrabold text-team-primary sm:text-5xl">
                    {Number.isNaN(secsToKick) ? '—' : formatCountdown(secsToKick)}
                  </div>
                </div>
                <span className={`ml-auto rounded-full border px-4 py-2 text-sm font-bold tracking-wide ${statusUi.cls}`}>
                  {statusUi.text}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/board"
                  className="rounded-full bg-team-primary px-6 py-3 text-base font-bold tracking-wider text-white hover:bg-team-primary/85"
                >
                  Open Game Day Ops →
                </Link>
                <Link
                  to="/admin"
                  className="rounded-full border border-white/20 px-6 py-3 text-base font-bold tracking-wider text-slate-200 hover:bg-white/10"
                >
                  Edit timeline & schedule
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-2">
              <p className="text-slate-300">Load your schedule to get started.</p>
              <Link
                to="/admin"
                className="mt-3 inline-block rounded-full bg-team-primary px-6 py-3 text-base font-bold tracking-wider text-white hover:bg-team-primary/85"
              >
                Import your schedule →
              </Link>
            </div>
          )}
        </section>

        {/* GAME READY checklist */}
        {hasGame && (
          <section className="rounded-2xl border border-white/10 bg-navy-950/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Game Ready</div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusUi.cls}`}>{statusUi.text}</span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <span className="flex items-center gap-2 text-sm">
                    <span className={c.ok ? 'text-alert-go' : c.required ? 'text-bills-red' : 'text-alert-warn'}>
                      {c.ok ? '✓' : '!'}
                    </span>
                    <span className={c.ok ? 'text-slate-200' : 'text-slate-300'}>{c.label}</span>
                  </span>
                  {!c.ok && (
                    <Link to="/admin" className="text-xs font-bold text-team-primary hover:underline">
                      Fix this →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* UPCOMING GAMES */}
        <section className="rounded-2xl border border-white/10 bg-navy-950/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Upcoming Games</div>
            <div className="text-xs text-slate-500">{state.season} Season</div>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
              No upcoming games loaded.{' '}
              <Link to="/admin" className="font-bold text-team-primary hover:underline">Import your schedule →</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {upcoming.slice(0, 8).map((g) => {
                const o = g.opponentId ? getTeam(g.opponentId) : null
                const on = o ? o.name : g.opponentName ?? 'TBD'
                const isActive = g.id === state.game.sourceGameId
                return (
                  <button
                    key={g.id}
                    onClick={() => loadGameToBoard(g)}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-4 py-2.5 text-left transition hover:bg-white/[0.04] ${
                      isActive ? 'border-team-primary/60 bg-navy-950/60 ring-1 ring-team-primary/40' : 'border-white/10 bg-navy-950/40'
                    }`}
                  >
                    <span className="w-[86px] shrink-0 font-display text-sm font-bold text-slate-300">{g.weekLabel}</span>
                    <span className="w-[120px] shrink-0 text-sm font-semibold text-slate-300">{fmtDate(g.date)}</span>
                    <span className="min-w-[160px] flex-1 font-display text-lg font-bold">
                      <span className="text-slate-400">{g.homeAway === 'HOME' ? 'vs ' : 'at '}</span>
                      <span className="text-white">{on}</span>
                    </span>
                    <span className="tnum w-[92px] shrink-0 font-mono text-sm font-bold text-sky-300">{fmtTime(g.time)}</span>
                    <span className="text-xs font-bold text-team-primary">{isActive ? 'LOADED' : 'Load →'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <footer className="flex flex-wrap items-center justify-center gap-3 py-4 text-xs text-slate-500">
          <Link to="/welcome" className="hover:text-white">Home</Link>
          <span className="opacity-40">·</span>
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <span className="opacity-40">·</span>
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <span className="opacity-40">·</span>
          <Link to="/support" className="hover:text-white">Support</Link>
        </footer>
      </main>
    </div>
  )
}

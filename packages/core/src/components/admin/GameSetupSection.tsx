import { useDashboard } from '../../context/DashboardContext'
import { formatClock, kickoffMs } from '../../lib/time'
import { getTeam, masterGames, applyOverride } from '../../product'
import { selectNextGame, toGameInfo } from '../../lib/nextGame'
import { useResolvedSchedule } from '../../hooks/useResolvedSchedule'
import { Section, Field, TextInput, Select, Button } from './ui'
import TeamPicker from './TeamPicker'

/** Edit the game-day header info: team, opponent, week, home/away, kickoff. */
export default function GameSetupSection() {
  const { state, actions } = useDashboard()
  const { game } = state
  const kickoffAt = kickoffMs(game)
  const kickoffValid = !Number.isNaN(kickoffAt)
  const team = getTeam(game.teamId)
  const resolved = useResolvedSchedule()
  const onManualPick =
    Boolean(game.manualOverride) ||
    Boolean(resolved.nextGame && game.sourceGameId && resolved.nextGame.id !== game.sourceGameId)

  // Resume automatic, schedule-driven selection.
  const useNextGame = () => {
    if (!resolved.nextGame) return
    const o = resolved.nextGame.opponentId ? getTeam(resolved.nextGame.opponentId) : null
    actions.loadGame(toGameInfo(resolved.nextGame, o ? o.name : resolved.nextGame.opponentName ?? '', { manual: false }))
  }

  // Switching teams re-themes the board AND loads that team's next scheduled
  // game (Part 9). If the new team has no schedule yet, the game is cleared so
  // the board honestly shows "no game — import your schedule".
  const changeTeam = (teamId: string) => {
    if (teamId === game.teamId) return
    const season = state.season
    const teamName = getTeam(teamId)?.name
    const custom = state.customGames.filter((g) => g.teamId === teamId && g.season === season)
    const base = (custom.length ? custom : masterGames(teamId, season)).map((g) =>
      applyOverride(g, state.gameOverrides[g.id]),
    )
    const next = selectNextGame(base, Date.now(), teamName)
    if (next) {
      const opp = next.opponentId ? getTeam(next.opponentId) : null
      actions.loadGame(toGameInfo(next, opp ? opp.name : next.opponentName ?? ''))
    } else {
      actions.setGame({
        teamId,
        opponentId: undefined,
        opponent: '',
        week: '',
        kickoffISO: '',
        kickoffTbd: false,
        venue: undefined,
        sourceGameId: undefined,
      })
    }
  }

  return (
    <Section title="Game Setup" subtitle="Header info & kickoff time" accent="red">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-navy-950/50 px-4 py-2.5">
        <span className="text-sm text-slate-300">
          {onManualPick ? (
            <>Manually selected game — automatic next-game is paused.</>
          ) : resolved.nextGame ? (
            <>Following the schedule automatically — next game resolves from your season.</>
          ) : (
            <>No upcoming games found — import or add a schedule below.</>
          )}
        </span>
        {onManualPick && resolved.nextGame && (
          <Button variant="ghost" onClick={useNextGame}>Use next scheduled game →</Button>
        )}
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Field label="Team (themes the board)">
          <TeamPicker value={game.teamId} onChange={changeTeam} placeholder="Select your team" />
        </Field>

        <Field label="Opponent">
          <TeamPicker
            value={game.opponentId ?? ''}
            excludeId={game.teamId}
            allowEmpty
            placeholder="Select opponent"
            onChange={(id) =>
              actions.setGame({ opponentId: id || undefined, opponent: id ? getTeam(id).name : '', manualOverride: true })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Week">
          <TextInput
            value={game.week}
            onChange={(e) => actions.setGame({ week: e.target.value })}
            placeholder="e.g. Week 1 / Wild Card"
          />
        </Field>

        <Field label="Home / Away">
          <Select
            value={game.homeAway}
            onChange={(e) => actions.setGame({ homeAway: e.target.value as 'HOME' | 'AWAY' })}
          >
            <option value="HOME">Home</option>
            <option value="AWAY">Away</option>
          </Select>
        </Field>

        <Field label="Kickoff — Eastern Time (ET)">
          <TextInput
            type="datetime-local"
            value={game.kickoffISO.slice(0, 16)}
            onChange={(e) => actions.setGame({ kickoffISO: e.target.value, kickoffTbd: false })}
          />
          {game.kickoffTbd && (
            <p className="mt-1 text-xs text-amber-300">
              Kickoff time is TBD from the schedule — set the exact time above.
            </p>
          )}
        </Field>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        {kickoffValid ? (
          <>
            Board themed as <span className="font-bold text-white">{team.name}</span>. Kickoff set
            for <span className="font-bold text-white">{formatClock(kickoffAt, false)} ET</span>.
            Enter times in Eastern; every clock and countdown updates automatically.
          </>
        ) : (
          <span className="text-bills-red">⚠ Invalid kickoff time — please re-enter.</span>
        )}
      </p>
    </Section>
  )
}

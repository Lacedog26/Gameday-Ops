import { useDashboard } from '../../context/DashboardContext'
import { formatClock, kickoffMs } from '../../lib/time'
import { getTeam, teamsByDivision } from '../../product'
import { Section, Field, TextInput, Select } from './ui'

/** Edit the game-day header info: team, opponent, week, home/away, kickoff. */
export default function GameSetupSection() {
  const { state, actions } = useDashboard()
  const { game } = state
  const kickoffAt = kickoffMs(game)
  const kickoffValid = !Number.isNaN(kickoffAt)
  const divisions = teamsByDivision()
  const team = getTeam(game.teamId)

  return (
    <Section title="Game Setup" subtitle="Header info & kickoff time" accent="red">
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Field label="Team (themes the board)">
          <Select
            value={game.teamId}
            onChange={(e) => actions.setGame({ teamId: e.target.value })}
          >
            {divisions.map((d) => (
              <optgroup key={d.label} label={d.label}>
                {d.teams.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <Field label="Opponent">
          <Select
            value={game.opponentId ?? ''}
            onChange={(e) => {
              const id = e.target.value
              actions.setGame({ opponentId: id, opponent: id ? getTeam(id).name : '' })
            }}
          >
            <option value="">— Select opponent —</option>
            {divisions.map((d) => (
              <optgroup key={d.label} label={d.label}>
                {d.teams
                  .filter((tm) => tm.id !== game.teamId)
                  .map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
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
            onChange={(e) => actions.setGame({ kickoffISO: e.target.value })}
          />
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

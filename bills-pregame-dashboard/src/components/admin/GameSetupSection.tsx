import { useDashboard } from '../../context/DashboardContext'
import { formatClock, kickoffMs } from '../../lib/time'
import { Section, Field, TextInput, Select } from './ui'

/** Edit the game-day header info: opponent, week, home/away, kickoff time. */
export default function GameSetupSection() {
  const { state, actions } = useDashboard()
  const { game } = state
  const kickoffAt = kickoffMs(game)
  const kickoffValid = !Number.isNaN(kickoffAt)

  return (
    <Section title="Game Setup" subtitle="Header info & kickoff time" accent="red">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Opponent">
          <TextInput
            value={game.opponent}
            onChange={(e) => actions.setGame({ opponent: e.target.value })}
            placeholder="e.g. New York Jets"
          />
        </Field>

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
            Kickoff set for{' '}
            <span className="font-bold text-white">{formatClock(kickoffAt, false)} ET</span>. Enter
            times in Eastern; every clock and countdown updates automatically.
          </>
        ) : (
          <span className="text-bills-red">⚠ Invalid kickoff time — please re-enter.</span>
        )}
      </p>
    </Section>
  )
}

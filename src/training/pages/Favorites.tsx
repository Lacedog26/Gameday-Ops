import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MUSCLE_BY_ID } from '../data/muscles'
import { useTraining } from '../state/store'
import ExerciseCard from '../components/ExerciseCard'
import { Button, Card, Chip, EmptyState, Eyebrow, PageHeader } from '../components/ui'

type Tab = 'exercises' | 'muscles' | 'workouts' | 'programs'

const TABS: { id: Tab; label: string }[] = [
  { id: 'exercises', label: 'Exercises' },
  { id: 'muscles', label: 'Muscles' },
  { id: 'workouts', label: 'Workouts' },
  { id: 'programs', label: 'Programs' },
]

export default function Favorites() {
  const { data, exerciseById, toggleFavorite } = useTraining()
  const [tab, setTab] = useState<Tab>('exercises')

  const exercises = data.favorites.exercises.map((id) => exerciseById(id)).filter(Boolean)
  const muscles = data.favorites.muscles.map((id) => MUSCLE_BY_ID[id]).filter(Boolean)
  const workouts = data.workouts.filter((w) => data.favorites.workouts.includes(w.id))
  const programs = data.programs.filter((p) => data.favorites.programs.includes(p.id))

  const counts: Record<Tab, number> = {
    exercises: exercises.length,
    muscles: muscles.length,
    workouts: workouts.length,
    programs: programs.length,
  }

  return (
    <div>
      <PageHeader eyebrow="Favorites" title="Favorites" subtitle="Everything you have pinned, stored locally on this device." />

      <div className="mb-6 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Chip key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} count={counts[t.id]}>
            {t.label}
          </Chip>
        ))}
      </div>

      {tab === 'exercises' ? (
        exercises.length === 0 ? (
          <EmptyState
            title="No favorite exercises"
            body="Tap the heart on any exercise card or detail page to pin it here."
            action={
              <Link to="/train/library">
                <Button variant="primary">Browse the library</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {exercises.map((e) => (
              <ExerciseCard key={e!.id} exercise={e!} />
            ))}
          </div>
        )
      ) : null}

      {tab === 'muscles' ? (
        muscles.length === 0 ? (
          <EmptyState
            title="No favorite muscles"
            body="Open a muscle from the explorer and pin it to keep it handy."
            action={
              <Link to="/train/muscles">
                <Button variant="primary">Open the Muscle Explorer</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {muscles.map((m) => (
              <Card key={m!.id} className="flex items-start justify-between gap-3 p-4">
                <Link to={`/train/muscles/${m!.id}`} className="min-w-0 flex-1">
                  <Eyebrow className="mb-1">{m!.group}</Eyebrow>
                  <p className="truncate text-[15px] font-semibold text-tr-text">{m!.name}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-tr-muted">{m!.actions.join(' · ')}</p>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => toggleFavorite('muscles', m!.id)}>
                  Remove
                </Button>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === 'workouts' ? (
        workouts.length === 0 ? (
          <EmptyState
            title="No favorite workouts"
            body="Build a workout and pin it from the Programs page."
            action={
              <Link to="/train/programs">
                <Button variant="primary">Open Programs</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workouts.map((w) => (
              <Card key={w.id} className="p-4">
                <Link to={`/train/programs?workout=${w.id}`}>
                  <p className="text-[15px] font-semibold text-tr-text">{w.name}</p>
                  <p className="mt-1 text-[12px] text-tr-muted">{w.items.length} exercises</p>
                </Link>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === 'programs' ? (
        programs.length === 0 ? (
          <EmptyState
            title="No favorite programs"
            body="Programs you pin will collect here."
            action={
              <Link to="/train/programs">
                <Button variant="primary">Open Programs</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {programs.map((p) => (
              <Card key={p.id} className="p-4">
                <p className="text-[15px] font-semibold text-tr-text">{p.name}</p>
                <p className="mt-1 text-[12px] text-tr-muted">{p.phases.length} phases</p>
              </Card>
            ))}
          </div>
        )
      ) : null}
    </div>
  )
}

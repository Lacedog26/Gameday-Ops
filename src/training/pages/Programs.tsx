import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Program, Workout, WorkoutItem } from '../data/types'
import { newId, useTraining } from '../state/store'
import ExercisePicker from '../components/ExercisePicker'
import { Button, Card, Chip, EmptyState, Eyebrow, PageHeader, PlaceholderNote, SectionTitle, TextArea, TextInput, cx } from '../components/ui'

// ---------------------------------------------------------------------------
// Workout builder (working) and program builder (day / week / phase structure).
//
// Both write into the same local store as everything else, so they export and
// import with the rest of the user's data.
// ---------------------------------------------------------------------------

export default function Programs() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'workouts' | 'programs'>(params.get('tab') === 'programs' ? 'programs' : 'workouts')

  useEffect(() => {
    const next = new URLSearchParams(params)
    next.set('tab', tab)
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <div>
      <PageHeader
        eyebrow="Programs"
        title="Workouts &amp; Programs"
        subtitle="Build a session from the library, then organise sessions into days, weeks and phases. Everything is saved on this device."
      />
      <div className="mb-6 flex gap-1.5">
        <Chip active={tab === 'workouts'} onClick={() => setTab('workouts')}>
          Workouts
        </Chip>
        <Chip active={tab === 'programs'} onClick={() => setTab('programs')}>
          Programs
        </Chip>
      </div>
      {tab === 'workouts' ? <WorkoutsTab /> : <ProgramsTab />}
    </div>
  )
}

// --------------------------------------------------------------- workouts ---

function WorkoutsTab() {
  const [params, setParams] = useSearchParams()
  const { data, createWorkout, deleteWorkout } = useTraining()
  const selectedId = params.get('workout')
  const selected = data.workouts.find((w) => w.id === selectedId) ?? data.workouts[0]

  function select(id: string) {
    const next = new URLSearchParams(params)
    next.set('workout', id)
    setParams(next, { replace: true })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            const workout = createWorkout(`Session ${data.workouts.length + 1}`)
            select(workout.id)
          }}
        >
          New workout
        </Button>

        {data.workouts.length === 0 ? (
          <Card className="px-4 py-5">
            <p className="text-[12.5px] leading-relaxed text-tr-muted">No workouts yet. Create one and start adding exercises from the library.</p>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {data.workouts.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => select(w.id)}
                className={cx(
                  'flex w-full items-center justify-between gap-2 rounded-[3px] border px-3 py-2.5 text-left transition-colors',
                  selected?.id === w.id ? 'border-tr-accent bg-[#0A2A24]' : 'border-tr-line hover:border-tr-line2',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium text-tr-text">{w.name}</span>
                  <span className="tr-mono block text-[10px] uppercase tracking-wider text-tr-dim">
                    {w.items.length} {w.items.length === 1 ? 'exercise' : 'exercises'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0">
        {selected ? (
          <WorkoutEditor
            key={selected.id}
            workout={selected}
            onDelete={() => {
              deleteWorkout(selected.id)
              const next = new URLSearchParams(params)
              next.delete('workout')
              setParams(next, { replace: true })
            }}
          />
        ) : (
          <EmptyState title="No workout selected" body="Create a workout on the left to begin building a session." />
        )}
      </div>
    </div>
  )
}

function WorkoutEditor({ workout, onDelete }: { workout: Workout; onDelete: () => void }) {
  const { exerciseById, updateWorkout, addExerciseToWorkout, updateWorkoutItem, removeWorkoutItem, moveWorkoutItem, isFavorite, toggleFavorite, data } =
    useTraining()
  const [name, setName] = useState(workout.name)

  const totalSets = useMemo(() => workout.items.reduce((sum, i) => sum + (i.sets ?? 0), 0), [workout.items])
  const favorite = isFavorite('workouts', workout.id)

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="tr-eyebrow mb-1.5 block text-tr-dim">Workout name</span>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => updateWorkout({ ...workout, name: name.trim() || workout.name })}
            />
          </label>
          <Button variant={favorite ? 'primary' : 'outline'} onClick={() => toggleFavorite('workouts', workout.id)}>
            {favorite ? 'Favorited' : 'Favorite'}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm(`Delete "${workout.name}"?`)) onDelete()
            }}
          >
            Delete
          </Button>
        </div>
        <div className="mt-3">
          <span className="tr-eyebrow mb-1.5 block text-tr-dim">Session notes</span>
          <TextArea
            defaultValue={workout.notes ?? ''}
            placeholder="Intent, environment, anything worth remembering next time…"
            onBlur={(e) => updateWorkout({ ...workout, notes: e.target.value })}
          />
        </div>
        <p className="tr-mono mt-3 text-[10.5px] uppercase tracking-wider text-tr-dim">
          {workout.items.length} exercises · {totalSets} total sets
        </p>
      </Card>

      <Card className="p-4">
        <SectionTitle>Add an exercise</SectionTitle>
        <ExercisePicker onPick={(exerciseId) => addExerciseToWorkout(workout.id, exerciseId)} />
      </Card>

      {workout.items.length === 0 ? (
        <EmptyState title="Empty session" body="Search above and add your first exercise." />
      ) : (
        <ol className="space-y-3">
          {workout.items.map((item, index) => {
            const exercise = exerciseById(item.exerciseId)
            return (
              <li key={item.id}>
                <Card className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-3">
                      <span className="tr-mono text-[13px] text-tr-dim">{String(index + 1).padStart(2, '0')}</span>
                      <div className="min-w-0">
                        {exercise ? (
                          <Link to={`/train/exercise/${exercise.id}`} className="tr-display block truncate text-[19px] text-tr-text hover:text-tr-accent">
                            {exercise.name}
                          </Link>
                        ) : (
                          <span className="tr-display block truncate text-[19px] text-tr-dim">Missing exercise ({item.exerciseId})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" aria-label="Move up" disabled={index === 0} onClick={() => moveWorkoutItem(workout.id, item.id, -1)}>
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Move down"
                        disabled={index === workout.items.length - 1}
                        onClick={() => moveWorkoutItem(workout.id, item.id, 1)}
                      >
                        ↓
                      </Button>
                      <Button size="sm" variant="ghost" aria-label="Remove exercise" onClick={() => removeWorkoutItem(workout.id, item.id)}>
                        ✕
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <NumberField label="Sets" value={item.sets} onChange={(v) => updateWorkoutItem(workout.id, item.id, { sets: v })} />
                    <NumberField label="Reps" value={item.reps} onChange={(v) => updateWorkoutItem(workout.id, item.id, { reps: v })} />
                    <NumberField label="Time (s)" value={item.duration} onChange={(v) => updateWorkoutItem(workout.id, item.id, { duration: v })} />
                    <NumberField
                      label={data.settings.units === 'metric' ? 'Dist (m)' : 'Dist (yd)'}
                      value={item.distance}
                      onChange={(v) => updateWorkoutItem(workout.id, item.id, { distance: v })}
                    />
                    <NumberField label="Rest (s)" value={item.rest} onChange={(v) => updateWorkoutItem(workout.id, item.id, { rest: v })} />
                  </div>

                  <div className="mt-2">
                    <TextInput
                      defaultValue={item.notes ?? ''}
                      placeholder="Notes for this exercise…"
                      onBlur={(e) => updateWorkoutItem(workout.id, item.id, { notes: e.target.value })}
                    />
                  </div>

                  <p className="tr-mono mt-2 text-[10.5px] uppercase tracking-wider text-tr-dim">{summarise(item, data.settings.units)}</p>
                </Card>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function summarise(item: WorkoutItem, units: 'metric' | 'imperial'): string {
  const parts: string[] = []
  if (item.sets) parts.push(`${item.sets} sets`)
  if (item.reps) parts.push(`${item.reps} reps`)
  if (item.duration) parts.push(`${item.duration}s`)
  if (item.distance) parts.push(`${item.distance}${units === 'metric' ? 'm' : 'yd'}`)
  if (item.rest) parts.push(`${item.rest}s rest`)
  return parts.length > 0 ? parts.join(' · ') : 'No prescription set'
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <label className="block">
      <span className="tr-eyebrow mb-1 block text-tr-dim">{label}</span>
      <TextInput
        type="number"
        min={0}
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === '' ? undefined : Math.max(0, Number(raw)))
        }}
        className="tr-mono px-2 py-1.5 text-[13px]"
      />
    </label>
  )
}

// --------------------------------------------------------------- programs ---

function ProgramsTab() {
  const { data, createProgram, deleteProgram, updateProgram } = useTraining()
  const [selectedId, setSelectedId] = useState<string | null>(data.programs[0]?.id ?? null)
  const selected = data.programs.find((p) => p.id === selectedId) ?? data.programs[0]

  return (
    <div className="space-y-5">
      <PlaceholderNote>
        <strong className="text-tr-text">Phase 5 in progress.</strong> The day / week / phase structure is live and saves locally, so anything you
        build now stays readable. Templates, week duplication and program-level progression rules are still to come.
      </PlaceholderNote>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              const program = createProgram(`Program ${data.programs.length + 1}`)
              setSelectedId(program.id)
            }}
          >
            New program
          </Button>
          {data.programs.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={cx(
                'flex w-full flex-col rounded-[3px] border px-3 py-2.5 text-left transition-colors',
                selected?.id === p.id ? 'border-tr-accent bg-[#0A2A24]' : 'border-tr-line hover:border-tr-line2',
              )}
            >
              <span className="truncate text-[13.5px] font-medium text-tr-text">{p.name}</span>
              <span className="tr-mono text-[10px] uppercase tracking-wider text-tr-dim">
                {p.phases.length} phases · {p.phases.reduce((n, ph) => n + ph.weeks.length, 0)} weeks
              </span>
            </button>
          ))}
        </div>

        <div className="min-w-0">
          {selected ? (
            <ProgramEditor
              key={selected.id}
              program={selected}
              onChange={updateProgram}
              onDelete={() => {
                deleteProgram(selected.id)
                setSelectedId(null)
              }}
            />
          ) : (
            <EmptyState title="No program selected" body="Create a program to lay out days, weeks and phases." />
          )}
        </div>
      </div>
    </div>
  )
}

function ProgramEditor({ program, onChange, onDelete }: { program: Program; onChange: (p: Program) => void; onDelete: () => void }) {
  const { exerciseById } = useTraining()
  const [name, setName] = useState(program.name)
  const [openDay, setOpenDay] = useState<string | null>(null)

  function mutateDay(phaseId: string, weekId: string, dayId: string, fn: (items: WorkoutItem[]) => WorkoutItem[]) {
    onChange({
      ...program,
      phases: program.phases.map((ph) =>
        ph.id !== phaseId
          ? ph
          : {
              ...ph,
              weeks: ph.weeks.map((w) =>
                w.id !== weekId ? w : { ...w, days: w.days.map((d) => (d.id !== dayId ? d : { ...d, items: fn(d.items) })) },
              ),
            },
      ),
    })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="tr-eyebrow mb-1.5 block text-tr-dim">Program name</span>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} onBlur={() => onChange({ ...program, name: name.trim() || program.name })} />
          </label>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm(`Delete "${program.name}"?`)) onDelete()
            }}
          >
            Delete
          </Button>
        </div>
        <div className="mt-3">
          <span className="tr-eyebrow mb-1.5 block text-tr-dim">Goal</span>
          <TextInput defaultValue={program.goal ?? ''} placeholder="e.g. Lower body power" onBlur={(e) => onChange({ ...program, goal: e.target.value })} />
        </div>
      </Card>

      {program.phases.map((phase) => (
        <Card key={phase.id} className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Eyebrow>{phase.name}</Eyebrow>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onChange({
                  ...program,
                  phases: program.phases.map((ph) =>
                    ph.id !== phase.id
                      ? ph
                      : {
                          ...ph,
                          weeks: [...ph.weeks, { id: newId('wkk'), name: `Week ${ph.weeks.length + 1}`, days: [{ id: newId('day'), name: 'Day 1', items: [] }] }],
                        },
                  ),
                })
              }
            >
              + Week
            </Button>
          </div>

          <div className="space-y-3">
            {phase.weeks.map((week) => (
              <div key={week.id} className="rounded-[3px] border border-tr-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-tr-text">{week.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onChange({
                        ...program,
                        phases: program.phases.map((ph) =>
                          ph.id !== phase.id
                            ? ph
                            : {
                                ...ph,
                                weeks: ph.weeks.map((w) =>
                                  w.id !== week.id ? w : { ...w, days: [...w.days, { id: newId('day'), name: `Day ${w.days.length + 1}`, items: [] }] },
                                ),
                              },
                        ),
                      })
                    }
                  >
                    + Day
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {week.days.map((day) => (
                    <div key={day.id} className="rounded-[3px] border border-tr-line bg-tr-surface/60 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="tr-eyebrow text-tr-muted">{day.name}</span>
                        <button
                          type="button"
                          onClick={() => setOpenDay(openDay === day.id ? null : day.id)}
                          className="text-[11px] text-tr-accent hover:underline"
                        >
                          {openDay === day.id ? 'Done' : 'Add exercise'}
                        </button>
                      </div>

                      {day.items.length === 0 ? (
                        <p className="text-[11.5px] text-tr-dim">No exercises yet.</p>
                      ) : (
                        <ol className="space-y-1">
                          {day.items.map((item, i) => {
                            const exercise = exerciseById(item.exerciseId)
                            return (
                              <li key={item.id} className="flex items-center justify-between gap-2 text-[12px]">
                                <span className="min-w-0 truncate text-tr-muted">
                                  <span className="tr-mono mr-2 text-tr-dim">{i + 1}</span>
                                  {exercise?.name ?? item.exerciseId}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Remove"
                                  onClick={() => mutateDay(phase.id, week.id, day.id, (items) => items.filter((x) => x.id !== item.id))}
                                  className="shrink-0 text-tr-dim hover:text-tr-primary"
                                >
                                  ✕
                                </button>
                              </li>
                            )
                          })}
                        </ol>
                      )}

                      {openDay === day.id ? (
                        <div className="mt-3 border-t border-tr-line pt-3">
                          <ExercisePicker
                            limit={5}
                            onPick={(exerciseId) =>
                              mutateDay(phase.id, week.id, day.id, (items) => [...items, { id: newId('item'), exerciseId, sets: 3, reps: 5, rest: 90 }])
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={() =>
          onChange({
            ...program,
            phases: [
              ...program.phases,
              {
                id: newId('ph'),
                name: `Phase ${program.phases.length + 1}`,
                weeks: [{ id: newId('wkk'), name: 'Week 1', days: [{ id: newId('day'), name: 'Day 1', items: [] }] }],
              },
            ],
          })
        }
      >
        + Add phase
      </Button>
    </div>
  )
}

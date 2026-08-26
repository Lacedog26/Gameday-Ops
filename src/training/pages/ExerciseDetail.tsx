import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Exercise, MuscleRole } from '../data/types'
import { CATEGORY_BY_ID, EQUIPMENT_NAME, GOAL_NAME, MOVEMENT_BY_ID, RTP_STAGE_NAME } from '../data/taxonomy'
import { MUSCLE_BY_ID } from '../data/muscles'
import { dominantAnatomyView, muscleHighlightMap, relatedExercises, resolveExerciseMuscles, resolveExerciseRef } from '../data/queries'
import { EMPHASIS_DISCLAIMER, EMPHASIS_LABEL, ROLE_ORDER, ROLE_STYLES } from '../config/visual'
import { useTraining } from '../state/store'
import AnatomyPanel from '../components/anatomy/AnatomyPanel'
import MediaFrame from '../components/MediaFrame'
import ExerciseCard from '../components/ExerciseCard'
import { Button, Card, EmptyState, Eyebrow, FavoriteButton, SectionTitle, StatLine, Tag, cx } from '../components/ui'

// ---------------------------------------------------------------------------
// Exercise detail — the page where anatomy, media and coaching content meet.
//
// Opening an exercise resolves its muscle data, paints the anatomy with role
// and emphasis, and lets the muscle list drive isolation on the body map.
// ---------------------------------------------------------------------------

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { exercises, exerciseById, addRecentlyViewed, isFavorite, toggleFavorite, data, deleteCustomExercise } = useTraining()

  const exercise = id ? exerciseById(id) : undefined

  const [view, setView] = useState<'anterior' | 'posterior'>(data.settings.defaultAnatomyView)
  const [selectedMuscleId, setSelectedMuscleId] = useState<string | null>(null)
  const [isolated, setIsolated] = useState<string[]>([])

  // Open the anatomy on whichever side carries the exercise's primary work, so
  // a posterior-chain lift does not land on the anterior view.
  useEffect(() => {
    if (!exercise) return
    addRecentlyViewed(exercise.id)
    setSelectedMuscleId(null)
    setIsolated([])
    setView(dominantAnatomyView(exercise, data.settings.defaultAnatomyView))
  }, [exercise, addRecentlyViewed, data.settings.defaultAnatomyView])

  const highlights = useMemo(() => (exercise ? muscleHighlightMap(exercise) : new Map()), [exercise])
  const resolved = useMemo(() => (exercise ? resolveExerciseMuscles(exercise) : []), [exercise])
  const related = useMemo(() => (exercise ? relatedExercises(exercises, exercise) : []), [exercises, exercise])

  if (!exercise) {
    return (
      <EmptyState
        title="Exercise not found"
        body="That exercise id is not in the library. It may have been deleted, or the link may be out of date."
        action={
          <Link to="/train/library">
            <Button variant="outline">Back to the library</Button>
          </Link>
        }
      />
    )
  }

  const category = CATEGORY_BY_ID[exercise.category]
  const subcategory = category?.subcategories.find((s) => s.id === exercise.subcategory)?.name ?? exercise.subcategory
  const favorite = isFavorite('exercises', exercise.id)

  const byRole = (role: MuscleRole) => resolved.filter((r) => r.role === role).sort((a, b) => b.emphasis - a.emphasis)

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 text-[12px] text-tr-dim">
        <Link to="/train/library" className="hover:text-tr-accent">
          Library
        </Link>
        <span>/</span>
        <Link to={`/train/categories/${exercise.category}`} className="hover:text-tr-accent">
          {category?.name}
        </Link>
        <span>/</span>
        <span className="truncate text-tr-muted">{exercise.name}</span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Eyebrow className="mb-2">
            {category?.name} · {subcategory}
            {exercise.custom ? ' · Custom' : ''}
          </Eyebrow>
          <h1 className="tr-display text-[clamp(30px,4.4vw,48px)] leading-none text-tr-text">{exercise.name}</h1>
          <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-tr-muted">{exercise.description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {exercise.trainingGoals.map((g) => (
              <Tag key={g} tone="accent">
                {GOAL_NAME[g] ?? g}
              </Tag>
            ))}
            {exercise.rtpStage ? <Tag tone="secondary">RTP · {RTP_STAGE_NAME[exercise.rtpStage]}</Tag> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <FavoriteButton active={favorite} onClick={() => toggleFavorite('exercises', exercise.id)} label={exercise.name} />
          {exercise.custom ? (
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm(`Delete "${exercise.name}"? This cannot be undone.`)) {
                  deleteCustomExercise(exercise.id)
                  navigate('/train/library')
                }
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </header>

      {/* Stage + facts */}
      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          <MediaFrame exercise={exercise} />
          <AnatomyPanel
            highlights={highlights}
            view={view}
            onViewChange={setView}
            selectedMuscleId={selectedMuscleId}
            onSelectMuscle={setSelectedMuscleId}
            isolatedMuscleIds={isolated}
            intensity={data.settings.highlightIntensity}
            compact
            heightClass="h-[440px]"
          />
        </div>

        <div className="space-y-5">
          <Card className="p-4">
            <SectionTitle>Muscles involved</SectionTitle>
            <p className="mb-3 text-[12px] leading-relaxed text-tr-dim">
              Select a muscle to isolate it on the anatomy. {EMPHASIS_DISCLAIMER}
            </p>
            <div className="space-y-4">
              {ROLE_ORDER.map((role) => {
                const group = byRole(role)
                if (group.length === 0) return null
                return (
                  <div key={role}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-[1px]" style={{ background: ROLE_STYLES[role].color }} />
                      <span className="tr-eyebrow text-tr-muted">{ROLE_STYLES[role].label}</span>
                      <span className="tr-mono text-[10px] text-tr-dim">{group.length}</span>
                    </div>
                    <ul className="space-y-1">
                      {group.map(({ muscle, emphasis }) => {
                        const active = selectedMuscleId === muscle.id
                        return (
                          <li key={muscle.id}>
                            <div
                              className={cx(
                                'flex items-center gap-2 rounded-[3px] border px-2 py-1.5 transition-colors',
                                active ? 'border-tr-accent bg-[#0A2A24]' : 'border-transparent hover:border-tr-line hover:bg-tr-hi',
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMuscleId(active ? null : muscle.id)
                                  setView(muscle.view === 'posterior' ? 'posterior' : muscle.view === 'anterior' ? 'anterior' : view)
                                }}
                                className="min-w-0 flex-1 text-left"
                                aria-pressed={active}
                              >
                                <span className={cx('block truncate text-[13px] font-medium', active ? 'text-tr-accent' : 'text-tr-text')}>
                                  {muscle.name}
                                </span>
                                <span className="block truncate text-[11px] text-tr-dim">{muscle.group}</span>
                              </button>

                              {data.settings.showEmphasisValues ? (
                                <div className="flex w-24 shrink-0 items-center gap-1.5" title={`${EMPHASIS_LABEL}: ${emphasis}/100`}>
                                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-tr-line">
                                    <div className="h-full rounded-full" style={{ width: `${emphasis}%`, background: ROLE_STYLES[role].color }} />
                                  </div>
                                  <span className="tr-mono w-6 text-right text-[10px] text-tr-dim">{emphasis}</span>
                                </div>
                              ) : null}

                              <Link
                                to={`/train/muscles/${muscle.id}`}
                                title={`Open ${muscle.name} in the Muscle Explorer`}
                                aria-label={`Open ${muscle.name} in the Muscle Explorer`}
                                className="shrink-0 rounded p-1 text-tr-dim hover:text-tr-accent"
                              >
                                <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5">
                                  <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </Link>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-tr-line pt-3">
              <Button
                size="sm"
                variant={isolated.length > 0 ? 'primary' : 'outline'}
                onClick={() => setIsolated(isolated.length > 0 ? [] : [...highlights.keys()])}
              >
                {isolated.length > 0 ? 'Show all muscles' : 'Isolate involved muscles'}
              </Button>
              {selectedMuscleId ? (
                <Button size="sm" variant="outline" onClick={() => setIsolated([selectedMuscleId])}>
                  Isolate {MUSCLE_BY_ID[selectedMuscleId]?.name}
                </Button>
              ) : null}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle>Detail</SectionTitle>
            <StatLine label="Category" value={`${category?.name} · ${subcategory}`} />
            <StatLine label="Movement pattern" value={exercise.movementPattern.map((mp) => MOVEMENT_BY_ID[mp]?.name ?? mp).join(', ')} />
            <StatLine label="Equipment" value={exercise.equipment.map((e) => EQUIPMENT_NAME[e] ?? e).join(', ')} />
            <StatLine label="Difficulty" value={<span className="capitalize">{exercise.difficulty}</span>} />
            <StatLine label="Training objective" value={exercise.trainingGoals.map((g) => GOAL_NAME[g] ?? g).join(', ')} />
            {exercise.rtpStage ? <StatLine label="Return-to-play stage" value={RTP_STAGE_NAME[exercise.rtpStage]} /> : null}
            {exercise.tags.length > 0 ? (
              <div className="pt-3">
                <Eyebrow className="mb-2">Tags</Eyebrow>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.tags.map((t) => (
                    <Link key={t} to={`/train/library?q=${encodeURIComponent(t)}`}>
                      <Tag>{t}</Tag>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      {/* Coaching content */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ListCard title="Coaching cues" items={exercise.coachingCues} marker="accent" />
        <ListCard title="Common errors" items={exercise.commonErrors} marker="primary" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <RefCard title="Progressions" values={exercise.progressions} exercises={exercises} />
        <RefCard title="Regressions" values={exercise.regressions} exercises={exercises} />
        <ListCard title="Athletic application" items={exercise.athleticApplications} marker="stabilizer" />
      </div>

      {related.length > 0 ? (
        <section>
          <SectionTitle hint="Linked entries first, then exercises sharing a primary muscle.">Related exercises</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((e) => (
              <ExerciseCard key={e.id} exercise={e} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function ListCard({ title, items, marker }: { title: string; items: string[]; marker: 'accent' | 'primary' | 'stabilizer' }) {
  const colors = { accent: '#00D9A3', primary: '#FF4D3D', stabilizer: '#4DD4FF' }
  if (items.length === 0) return null
  return (
    <Card className="p-4">
      <SectionTitle>{title}</SectionTitle>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[1px]" style={{ background: colors[marker] }} />
            <span className="text-[13.5px] leading-relaxed text-tr-muted">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function RefCard({ title, values, exercises }: { title: string; values: string[]; exercises: Exercise[] }) {
  if (values.length === 0) return null
  return (
    <Card className="p-4">
      <SectionTitle>{title}</SectionTitle>
      <ul className="space-y-1.5">
        {values.map((value, i) => {
          const ref = resolveExerciseRef(exercises, value)
          return (
            <li key={i}>
              {ref.exercise ? (
                <Link
                  to={`/train/exercise/${ref.exercise.id}`}
                  className="flex items-center gap-2 rounded-[3px] border border-tr-line px-2.5 py-2 text-[13px] text-tr-text transition-colors hover:border-tr-accent hover:text-tr-accent"
                >
                  {ref.text}
                </Link>
              ) : (
                <span className="block rounded-[3px] border border-dashed border-tr-line px-2.5 py-2 text-[13px] text-tr-muted">{ref.text}</span>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

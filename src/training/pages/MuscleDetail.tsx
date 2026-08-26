import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { CategoryId, MuscleRole } from '../data/types'
import { MUSCLE_BY_ID } from '../data/muscles'
import { CATEGORY_BY_ID, REGION_NAME } from '../data/taxonomy'
import { exercisesForMuscle } from '../data/queries'
import { ROLE_STYLES } from '../config/visual'
import { useTraining } from '../state/store'
import AnatomyPanel from '../components/anatomy/AnatomyPanel'
import ExerciseCard from '../components/ExerciseCard'
import { Button, Card, Chip, EmptyState, Eyebrow, FavoriteButton, SectionTitle, StatLine, Tag, cx } from '../components/ui'

// ---------------------------------------------------------------------------
// Muscle page: anatomy, function, actions, and every exercise that trains it,
// filterable by the role the muscle plays and by training category.
// ---------------------------------------------------------------------------

const ROLE_FILTERS: { id: MuscleRole | 'all'; label: string }[] = [
  { id: 'all', label: 'All roles' },
  { id: 'primary', label: 'Primary' },
  { id: 'secondary', label: 'Secondary' },
  { id: 'stabilizer', label: 'Stabilizer' },
]

export default function MuscleDetail() {
  const { id } = useParams<{ id: string }>()
  const { exercises, data, isFavorite, toggleFavorite } = useTraining()
  const muscle = id ? MUSCLE_BY_ID[id] : undefined

  const [roleFilter, setRoleFilter] = useState<MuscleRole | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryId[]>([])
  const [view, setView] = useState<'anterior' | 'posterior'>(
    muscle && muscle.view !== 'both' ? muscle.view : data.settings.defaultAnatomyView,
  )

  const hits = useMemo(() => (muscle ? exercisesForMuscle(exercises, muscle.id) : []), [exercises, muscle])

  const filteredHits = useMemo(
    () =>
      hits.filter(
        (h) => (roleFilter === 'all' || h.role === roleFilter) && (categoryFilter.length === 0 || categoryFilter.includes(h.exercise.category)),
      ),
    [hits, roleFilter, categoryFilter],
  )

  const highlights = useMemo(() => {
    const map = new Map<string, { role: MuscleRole; emphasis: number }>()
    if (muscle) map.set(muscle.id, { role: 'primary', emphasis: 100 })
    return map
  }, [muscle])

  const categoriesPresent = useMemo(() => [...new Set(hits.map((h) => h.exercise.category))], [hits])

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: hits.length }
    for (const h of hits) counts[h.role] = (counts[h.role] ?? 0) + 1
    return counts
  }, [hits])

  if (!muscle) {
    return (
      <EmptyState
        title="Muscle not found"
        body="That muscle id is not in the reference data."
        action={
          <Link to="/train/muscles">
            <Button variant="outline">Back to the Muscle Explorer</Button>
          </Link>
        }
      />
    )
  }

  const favorite = isFavorite('muscles', muscle.id)

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 text-[12px] text-tr-dim">
        <Link to="/train/muscles" className="hover:text-tr-accent">
          Muscle Explorer
        </Link>
        <span>/</span>
        <span className="text-tr-muted">{muscle.name}</span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Eyebrow className="mb-2">
            {REGION_NAME[muscle.region]} · {muscle.group} · {muscle.layer}
          </Eyebrow>
          <h1 className="tr-display text-[clamp(30px,4.4vw,48px)] leading-none text-tr-text">{muscle.name}</h1>
          {muscle.latinName ? <p className="mt-2 text-[14px] italic text-tr-dim">{muscle.latinName}</p> : null}
        </div>
        <FavoriteButton active={favorite} onClick={() => toggleFavorite('muscles', muscle.id)} label={muscle.name} />
      </header>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <AnatomyPanel
            view={view}
            onViewChange={setView}
            highlights={highlights}
            selectedMuscleId={muscle.id}
            isolatedMuscleIds={[muscle.id]}
            intensity={data.settings.highlightIntensity}
            showLegend={false}
            compact
            heightClass="h-[420px]"
          />
          <Card className="p-4">
            <StatLine label="Region" value={REGION_NAME[muscle.region]} />
            <StatLine label="Layer" value={<span className="capitalize">{muscle.layer}</span>} />
            <StatLine label="Visible from" value={<span className="capitalize">{muscle.view}</span>} />
            {muscle.origin ? <StatLine label="Origin" value={muscle.origin} /> : null}
            {muscle.insertion ? <StatLine label="Insertion" value={muscle.insertion} /> : null}
            <StatLine label="3D mesh key" value={<span className="tr-mono text-[11.5px] text-tr-dim">{muscle.anatomyModelId}</span>} />
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card className="p-4">
            <SectionTitle>Anatomy</SectionTitle>
            <p className="text-[14px] leading-relaxed text-tr-muted">{muscle.anatomy}</p>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card className="p-4">
              <SectionTitle>Function</SectionTitle>
              <ul className="space-y-2.5">
                {muscle.functions.map((f, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[1px] bg-tr-accent" />
                    <span className="text-[13.5px] leading-relaxed text-tr-muted">{f}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4">
              <SectionTitle>Primary actions</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {muscle.actions.map((a) => (
                  <Tag key={a}>{a}</Tag>
                ))}
              </div>
              {muscle.mobilityNotes ? (
                <>
                  <Eyebrow className="mb-1.5 mt-4">Mobility considerations</Eyebrow>
                  <p className="text-[13px] leading-relaxed text-tr-muted">{muscle.mobilityNotes}</p>
                </>
              ) : null}
            </Card>
          </div>

          {muscle.relatedMuscles.length > 0 ? (
            <Card className="p-4">
              <SectionTitle>Related muscles</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {muscle.relatedMuscles.map((rid) => {
                  const related = MUSCLE_BY_ID[rid]
                  if (!related) return null
                  return (
                    <Link
                      key={rid}
                      to={`/train/muscles/${rid}`}
                      className="rounded-[3px] border border-tr-line px-2.5 py-1.5 text-[12.5px] text-tr-muted transition-colors hover:border-tr-accent hover:text-tr-accent"
                    >
                      {related.name}
                    </Link>
                  )
                })}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Exercises that train this muscle */}
      <section>
        <SectionTitle hint="Filter by the role this muscle plays in each exercise, or by training category.">
          Exercises that train this muscle
        </SectionTitle>

        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap gap-1.5">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoleFilter(r.id)}
                aria-pressed={roleFilter === r.id}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1 text-[12px] font-medium transition-colors',
                  roleFilter === r.id ? 'border-tr-accent bg-[#0A2A24] text-tr-accent' : 'border-tr-line text-tr-muted hover:text-tr-text',
                )}
              >
                {r.id !== 'all' ? <span className="h-2 w-2 rounded-[1px]" style={{ background: ROLE_STYLES[r.id].color }} /> : null}
                {r.label}
                <span className="tr-mono text-[10px] text-tr-dim">{roleCounts[r.id] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categoriesPresent.map((c) => (
              <Chip
                key={c}
                active={categoryFilter.includes(c)}
                onClick={() => setCategoryFilter((prev) => (prev.includes(c) ? prev.filter((v) => v !== c) : [...prev, c]))}
              >
                {CATEGORY_BY_ID[c]?.name ?? c}
              </Chip>
            ))}
          </div>
        </div>

        {filteredHits.length === 0 ? (
          <EmptyState
            title="No exercises match"
            body={hits.length === 0 ? 'No exercise in the library currently lists this muscle.' : 'Try clearing the role or category filters.'}
            action={
              <Link to="/train/library">
                <Button variant="outline">Browse the library</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredHits.map((hit) => (
              <div key={hit.exercise.id} className="relative">
                <span
                  className="tr-mono absolute -top-1.5 left-3 z-10 rounded-[2px] px-1.5 py-[1px] text-[9px] uppercase tracking-wider"
                  style={{ background: ROLE_STYLES[hit.role].color, color: '#07090E' }}
                >
                  {ROLE_STYLES[hit.role].label}
                </span>
                <ExerciseCard exercise={hit.exercise} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

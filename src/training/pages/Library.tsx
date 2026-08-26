import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { CategoryId, EquipmentId, MovementId, MuscleRegion, TrainingGoal } from '../data/types'
import { MUSCLE_BY_ID } from '../data/muscles'
import { muscleHighlightMap } from '../data/queries'
import { useTraining } from '../state/store'
import { EMPTY_FILTERS, filterExercises, type ExerciseFilters } from '../lib/search'
import ExerciseCard from '../components/ExerciseCard'
import FilterPanel from '../components/FilterPanel'
import { Button, EmptyState, PageHeader, SearchInput, cx } from '../components/ui'

// ---------------------------------------------------------------------------
// Exercise library. Search and filters are combinable and the primary ones are
// reflected into the URL, so a filtered view is linkable and survives a reload.
// ---------------------------------------------------------------------------

function readFilters(params: URLSearchParams): ExerciseFilters {
  const list = (key: string) => params.get(key)?.split(',').filter(Boolean) ?? []
  return {
    ...EMPTY_FILTERS,
    query: params.get('q') ?? '',
    categories: list('cat') as CategoryId[],
    subcategories: list('sub'),
    regions: list('region') as MuscleRegion[],
    muscles: list('muscle'),
    movements: list('move') as MovementId[],
    equipment: list('equip') as EquipmentId[],
    goals: list('goal') as TrainingGoal[],
    favoritesOnly: params.get('fav') === '1',
  }
}

export default function Library() {
  const [params, setParams] = useSearchParams()
  const { exercises, data } = useTraining()
  const [filters, setFilters] = useState<ExerciseFilters>(() => readFilters(params))
  const [showFilters, setShowFilters] = useState(false)

  // Re-read when the URL changes from outside (a link from the dashboard, back button).
  useEffect(() => {
    setFilters(readFilters(params))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()])

  function apply(next: ExerciseFilters) {
    setFilters(next)
    const p = new URLSearchParams()
    if (next.query) p.set('q', next.query)
    if (next.categories.length) p.set('cat', next.categories.join(','))
    if (next.subcategories.length) p.set('sub', next.subcategories.join(','))
    if (next.regions.length) p.set('region', next.regions.join(','))
    if (next.muscles.length) p.set('muscle', next.muscles.join(','))
    if (next.movements.length) p.set('move', next.movements.join(','))
    if (next.equipment.length) p.set('equip', next.equipment.join(','))
    if (next.goals.length) p.set('goal', next.goals.join(','))
    if (next.favoritesOnly) p.set('fav', '1')
    setParams(p, { replace: true })
  }

  const results = useMemo(
    () => filterExercises(exercises, filters, { favorites: data.favorites.exercises }),
    [exercises, filters, data.favorites.exercises],
  )

  // Counts are computed against everything except the group being counted, so
  // a chip's number tells you what selecting it would actually give you.
  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    const base = filterExercises(exercises, { ...filters, categories: [], subcategories: [] }, { favorites: data.favorites.exercises })
    for (const e of base) out[`category:${e.category}`] = (out[`category:${e.category}`] ?? 0) + 1

    const noEquip = filterExercises(exercises, { ...filters, equipment: [] }, { favorites: data.favorites.exercises })
    for (const e of noEquip) for (const eq of e.equipment) out[`equipment:${eq}`] = (out[`equipment:${eq}`] ?? 0) + 1

    const noMove = filterExercises(exercises, { ...filters, movements: [] }, { favorites: data.favorites.exercises })
    for (const e of noMove) for (const mv of e.movementPattern) out[`movement:${mv}`] = (out[`movement:${mv}`] ?? 0) + 1

    const noGoal = filterExercises(exercises, { ...filters, goals: [] }, { favorites: data.favorites.exercises })
    for (const e of noGoal) for (const g of e.trainingGoals) out[`goal:${g}`] = (out[`goal:${g}`] ?? 0) + 1

    const noRegion = filterExercises(exercises, { ...filters, regions: [] }, { favorites: data.favorites.exercises })
    for (const e of noRegion) {
      const regions = new Set<string>()
      for (const id of muscleHighlightMap(e).keys()) {
        const region = MUSCLE_BY_ID[id]?.region
        if (region) regions.add(region)
      }
      for (const r of regions) out[`region:${r}`] = (out[`region:${r}`] ?? 0) + 1
    }
    return out
  }, [exercises, filters, data.favorites.exercises])

  const activeMuscleNames = filters.muscles.map((id) => MUSCLE_BY_ID[id]?.name ?? id)

  return (
    <div>
      <PageHeader
        eyebrow="Exercise Library"
        title="Exercise Library"
        subtitle="Every entry carries its full muscle map, coaching cues, progressions and athletic application. Search hits names, muscles, movements, equipment, goals and tags."
        actions={
          <Link to="/train/exercise/new">
            <Button variant="primary">Add exercise</Button>
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={filters.query}
          onChange={(q) => apply({ ...filters, query: q })}
          placeholder='Try "glute", "single leg", "posterior chain", "anti-rotation"…'
          ariaLabel="Search exercises"
        />
        <Button variant="outline" onClick={() => setShowFilters((s) => !s)} className="shrink-0 lg:hidden" aria-expanded={showFilters}>
          {showFilters ? 'Hide filters' : 'Filters'}
        </Button>
      </div>

      {activeMuscleNames.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px] text-tr-muted">
          <span className="tr-eyebrow text-tr-dim">Muscle</span>
          {activeMuscleNames.map((name, i) => (
            <span key={name} className="rounded-[3px] border border-tr-accent/50 bg-[#0A2A24] px-2 py-1 text-tr-accent">
              {name}
              <button
                type="button"
                onClick={() => apply({ ...filters, muscles: filters.muscles.filter((_, j) => j !== i) })}
                aria-label={`Remove ${name} filter`}
                className="ml-1.5 text-tr-accent/70 hover:text-tr-accent"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[268px_1fr]">
        <div className={cx('lg:sticky lg:top-6 lg:self-start', !showFilters && 'hidden lg:block')}>
          <FilterPanel filters={filters} onChange={apply} counts={counts} />
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="tr-mono text-[11px] uppercase tracking-wider text-tr-dim">
              {results.length} {results.length === 1 ? 'result' : 'results'}
              {results.length !== exercises.length ? ` of ${exercises.length}` : ''}
            </p>
          </div>

          {results.length === 0 ? (
            <EmptyState
              title="Nothing matches those filters"
              body="Try removing a filter, or search a broader term. Combining a category with an unrelated equipment type is the usual cause."
              action={
                <Button variant="outline" onClick={() => apply({ ...EMPTY_FILTERS })}>
                  Reset search and filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {results.map((exercise) => (
                <ExerciseCard key={exercise.id} exercise={exercise} view={data.settings.defaultAnatomyView} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

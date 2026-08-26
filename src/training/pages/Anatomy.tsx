import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { MuscleRole } from '../data/types'
import { MUSCLES, MUSCLE_BY_ID } from '../data/muscles'
import { REGION_NAME } from '../data/taxonomy'
import { exercisesForMuscle } from '../data/queries'
import { activeAnatomyModel, ANATOMY_ASSET_DIR } from '../config/anatomyAssets'
import { useTraining } from '../state/store'
import AnatomyPanel from '../components/anatomy/AnatomyPanel'
import { musclesInRegion } from '../components/anatomy/BodyMap'
import { Button, Card, Chip, Eyebrow, PageHeader, PlaceholderNote, SearchInput, SectionTitle, cx } from '../components/ui'
import { searchMuscles } from '../lib/search'

// ---------------------------------------------------------------------------
// The anatomy viewer page.
//
// Phase 1 ships the 2D body map as the working renderer. The 3D viewer is
// Phase 2 — the page states that plainly and shows exactly where a model file
// has to go and how it binds, rather than implying a 3D model already exists.
// ---------------------------------------------------------------------------

export default function Anatomy() {
  const { exercises, data } = useTraining()
  const [view, setView] = useState<'anterior' | 'posterior'>(data.settings.defaultAnatomyView)
  const [selected, setSelected] = useState<string | null>(null)
  const [isolated, setIsolated] = useState<string[]>([])
  const [query, setQuery] = useState('')

  const model = activeAnatomyModel()
  const muscle = selected ? MUSCLE_BY_ID[selected] : undefined

  const highlights = useMemo(() => {
    const map = new Map<string, { role: MuscleRole; emphasis: number }>()
    if (selected) map.set(selected, { role: 'primary', emphasis: 100 })
    return map
  }, [selected])

  const matches = useMemo(() => (query ? searchMuscles(MUSCLES, query).slice(0, 12) : []), [query])
  const relatedExerciseHits = useMemo(() => (muscle ? exercisesForMuscle(exercises, muscle.id).slice(0, 6) : []), [exercises, muscle])
  const siblings = useMemo(() => {
    if (!muscle) return []
    const ids = new Set<string>()
    for (const region of muscle.bodyMapRegions) for (const id of musclesInRegion(region)) ids.add(id)
    ids.delete(muscle.id)
    return [...ids].map((id) => MUSCLE_BY_ID[id]).filter(Boolean)
  }, [muscle])

  return (
    <div>
      <PageHeader
        eyebrow="3D Anatomy"
        title="Anatomy Viewer"
        subtitle="Select, isolate and dim muscle groups, toggle anatomy layers and switch between anterior and posterior views."
        actions={
          <Link to="/train/muscles">
            <Button variant="outline">Muscle list</Button>
          </Link>
        }
      />

      {!model ? (
        <div className="mb-5">
          <PlaceholderNote>
            <strong className="text-tr-text">Phase 1 renderer — 2D body map.</strong> No 3D anatomy model is installed, so the app is running its
            built-in interactive body map. That is a real, working viewer, not a mock: selection, isolation, layers and highlighting all function.
            The three.js viewer is Phase 2. To install a model, drop a GLB into <span className="tr-mono">{ANATOMY_ASSET_DIR}</span> and register it
            in <span className="tr-mono">src/training/config/anatomyAssets.ts</span> — muscles bind by their{' '}
            <span className="tr-mono">anatomyModelId</span> mesh name, so no exercise or muscle data has to change.
          </PlaceholderNote>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <AnatomyPanel
            view={view}
            onViewChange={setView}
            highlights={highlights}
            selectedMuscleId={selected}
            onSelectMuscle={(id) => {
              setSelected(id)
              if (!id) setIsolated([])
            }}
            isolatedMuscleIds={isolated}
            intensity={data.settings.highlightIntensity}
            showLegend={false}
            heightClass="h-[520px] sm:h-[600px]"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={isolated.length > 0 ? 'primary' : 'outline'}
              disabled={!selected && isolated.length === 0}
              onClick={() => setIsolated(isolated.length > 0 ? [] : selected ? [selected] : [])}
            >
              {isolated.length > 0 ? 'Exit isolation' : 'Isolate selection'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!muscle}
              onClick={() => {
                if (muscle) setIsolated(MUSCLES.filter((m) => m.group === muscle.group).map((m) => m.id))
              }}
            >
              Isolate group
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelected(null)
                setIsolated([])
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-4">
            <Eyebrow className="mb-2">Find a muscle</Eyebrow>
            <SearchInput value={query} onChange={setQuery} placeholder="Search by name or action…" ariaLabel="Search muscles" />
            {matches.length > 0 ? (
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelected(m.id)
                      if (m.view !== 'both') setView(m.view)
                      setQuery('')
                    }}
                    className={cx(
                      'flex w-full items-center justify-between gap-2 rounded-[3px] border px-2.5 py-1.5 text-left transition-colors',
                      selected === m.id ? 'border-tr-accent bg-[#0A2A24]' : 'border-tr-line hover:border-tr-line2',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-tr-text">{m.name}</span>
                      <span className="block truncate text-[11px] text-tr-dim">{m.group}</span>
                    </span>
                    <span className="tr-mono shrink-0 text-[9.5px] uppercase text-tr-dim">{m.layer}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </Card>

          {muscle ? (
            <Card className="p-4">
              <Eyebrow className="mb-1">Selected muscle</Eyebrow>
              <h2 className="tr-display text-[22px] leading-tight text-tr-text">{muscle.name}</h2>
              <p className="mt-0.5 text-[12px] italic text-tr-dim">{muscle.latinName}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-tr-muted">{muscle.anatomy}</p>

              <Eyebrow className="mb-1.5 mt-4">Actions</Eyebrow>
              <div className="flex flex-wrap gap-1.5">
                {muscle.actions.map((a) => (
                  <span key={a} className="rounded-[2px] border border-tr-line px-1.5 py-[2px] text-[11px] text-tr-muted">
                    {a}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
                <span className="text-tr-dim">Region</span>
                <span className="text-tr-text">{REGION_NAME[muscle.region]}</span>
                <span className="text-tr-dim">Layer</span>
                <span className="capitalize text-tr-text">{muscle.layer}</span>
                <span className="text-tr-dim">Mesh key</span>
                <span className="tr-mono truncate text-tr-muted">{muscle.anatomyModelId}</span>
              </div>

              {siblings.length > 0 ? (
                <>
                  <Eyebrow className="mb-1.5 mt-4">Also in this region</Eyebrow>
                  <div className="flex flex-wrap gap-1.5">
                    {siblings.map((s) => (
                      <button
                        key={s!.id}
                        type="button"
                        onClick={() => setSelected(s!.id)}
                        className="rounded-[3px] border border-tr-line px-2 py-1 text-[11.5px] text-tr-muted hover:border-tr-accent hover:text-tr-accent"
                      >
                        {s!.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-tr-line pt-3">
                <Link to={`/train/muscles/${muscle.id}`}>
                  <Button size="sm" variant="primary">
                    Full muscle page
                  </Button>
                </Link>
                <Link to={`/train/library?muscle=${muscle.id}`}>
                  <Button size="sm" variant="outline">
                    Exercises
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="px-4 py-6">
              <p className="text-[13px] leading-relaxed text-tr-muted">
                Nothing selected. Click a region on the body map, or search above. Regions containing several muscles will ask which one you meant.
              </p>
            </Card>
          )}

          {relatedExerciseHits.length > 0 ? (
            <Card className="p-4">
              <SectionTitle>Trains this muscle</SectionTitle>
              <div className="space-y-1">
                {relatedExerciseHits.map((hit) => (
                  <Link
                    key={hit.exercise.id}
                    to={`/train/exercise/${hit.exercise.id}`}
                    className="flex items-center justify-between gap-2 rounded-[3px] border border-tr-line px-2.5 py-1.5 text-[12.5px] text-tr-text transition-colors hover:border-tr-accent hover:text-tr-accent"
                  >
                    <span className="truncate">{hit.exercise.name}</span>
                    <span className="tr-mono shrink-0 text-[9.5px] uppercase text-tr-dim">{hit.role}</span>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <Eyebrow className="mb-2">Layers by region</Eyebrow>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(MUSCLES.map((m) => m.region))].map((r) => (
                <Chip
                  key={r}
                  onClick={() => {
                    const ids = MUSCLES.filter((m) => m.region === r).map((m) => m.id)
                    setIsolated(ids)
                    setSelected(ids[0] ?? null)
                  }}
                  count={MUSCLES.filter((m) => m.region === r).length}
                >
                  {REGION_NAME[r] ?? r}
                </Chip>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

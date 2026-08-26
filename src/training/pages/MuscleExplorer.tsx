import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MUSCLES } from '../data/muscles'
import { REGION_NAME } from '../data/taxonomy'
import { muscleUsageCounts } from '../data/queries'
import { searchMuscles } from '../lib/search'
import { useTraining } from '../state/store'
import AnatomyPanel from '../components/anatomy/AnatomyPanel'
import { Card, Chip, EmptyState, Eyebrow, PageHeader, SearchInput, cx } from '../components/ui'

// ---------------------------------------------------------------------------
// Muscle Explorer. Two ways in: pick on the body map, or search the list.
// ---------------------------------------------------------------------------

export default function MuscleExplorer() {
  const navigate = useNavigate()
  const { exercises, data } = useTraining()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'anterior' | 'posterior'>(data.settings.defaultAnatomyView)
  const [selected, setSelected] = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState<string[]>([])

  const usage = useMemo(() => muscleUsageCounts(exercises), [exercises])

  const filtered = useMemo(() => {
    const base = regionFilter.length > 0 ? MUSCLES.filter((m) => regionFilter.includes(m.region)) : MUSCLES
    return searchMuscles(base, query)
  }, [query, regionFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof MUSCLES>()
    for (const muscle of filtered) {
      const list = map.get(muscle.group) ?? []
      list.push(muscle)
      map.set(muscle.group, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const regions = useMemo(() => [...new Set(MUSCLES.map((m) => m.region))], [])

  const selectionHighlights = useMemo(() => {
    const map = new Map<string, { role: 'primary'; emphasis: number }>()
    if (selected) map.set(selected, { role: 'primary', emphasis: 100 })
    return map
  }, [selected])

  return (
    <div>
      <PageHeader
        eyebrow="Muscle Explorer"
        title="Muscle Explorer"
        subtitle="Select a muscle on the body map or from the list. Every muscle links straight to the exercises that train it, with the role each exercise gives it."
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <AnatomyPanel
            view={view}
            onViewChange={setView}
            highlights={selectionHighlights}
            selectedMuscleId={selected}
            onSelectMuscle={(id) => {
              setSelected(id)
              if (id) {
                const muscle = MUSCLES.find((m) => m.id === id)
                if (muscle && muscle.view !== 'both') setView(muscle.view)
              }
            }}
            showLegend={false}
            intensity={data.settings.highlightIntensity}
            heightClass="h-[460px]"
          />
          {selected ? (
            <Card className="mt-3 p-4">
              <Eyebrow className="mb-1">Selected</Eyebrow>
              <p className="tr-display text-[19px] text-tr-text">{MUSCLES.find((m) => m.id === selected)?.name}</p>
              <p className="mt-1 text-[12.5px] text-tr-muted">{MUSCLES.find((m) => m.id === selected)?.latinName}</p>
              <Link
                to={`/train/muscles/${selected}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-tr-accent hover:underline"
              >
                Open full muscle page →
              </Link>
            </Card>
          ) : (
            <Card className="mt-3 px-4 py-5">
              <p className="text-[12.5px] leading-relaxed text-tr-muted">
                Click a region on the body map to select a muscle. Where a region contains several muscles, you will be asked which one.
              </p>
            </Card>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Search muscles, groups or actions…" ariaLabel="Search muscles" />
          </div>

          <div className="mb-5 flex flex-wrap gap-1.5">
            {regions.map((r) => (
              <Chip
                key={r}
                active={regionFilter.includes(r)}
                onClick={() => setRegionFilter((prev) => (prev.includes(r) ? prev.filter((v) => v !== r) : [...prev, r]))}
              >
                {REGION_NAME[r] ?? r}
              </Chip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No muscles match" body="Try a different term, or clear the region filters." />
          ) : (
            <div className="space-y-6">
              {grouped.map(([group, muscles]) => (
                <section key={group}>
                  <Eyebrow className="mb-2">{group}</Eyebrow>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {muscles.map((muscle) => {
                      const count = usage.get(muscle.id) ?? 0
                      const active = selected === muscle.id
                      return (
                        <button
                          key={muscle.id}
                          type="button"
                          onMouseEnter={() => setSelected(muscle.id)}
                          onFocus={() => setSelected(muscle.id)}
                          onClick={() => navigate(`/train/muscles/${muscle.id}`)}
                          className={cx(
                            'tr-card tr-card-hover rounded-md p-3 text-left',
                            active && 'border-tr-accent/70',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold text-tr-text">{muscle.name}</p>
                              <p className="mt-0.5 truncate text-[11.5px] italic text-tr-dim">{muscle.latinName}</p>
                            </div>
                            <span
                              className={cx(
                                'tr-mono shrink-0 rounded-[2px] border px-1.5 py-[1px] text-[9.5px] uppercase tracking-wider',
                                muscle.layer === 'deep' ? 'border-tr-line2 text-tr-dim' : 'border-tr-line text-tr-muted',
                              )}
                            >
                              {muscle.layer}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-tr-muted">{muscle.actions.join(' · ')}</p>
                          <p className="tr-mono mt-2 text-[10px] uppercase tracking-wider text-tr-dim">
                            {count} {count === 1 ? 'exercise' : 'exercises'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

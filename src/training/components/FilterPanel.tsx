import { useMemo, useState } from 'react'
import type { CategoryId, Difficulty, EquipmentId, MovementId, MuscleRegion, RtpStage, TrainingGoal } from '../data/types'
import { CATEGORIES, DIFFICULTIES, EQUIPMENT, MOVEMENTS, REGIONS, RTP_STAGES, TRAINING_GOALS } from '../data/taxonomy'
import { activeFilterCount, EMPTY_FILTERS, type ExerciseFilters } from '../lib/search'
import { Button, Chip, cx, Eyebrow } from './ui'

// ---------------------------------------------------------------------------
// Combinable filters. Every group is AND-ed against the others; selections
// inside a group are OR-ed. Selecting Power + Plyometrics + Kettlebell means
// "(power or plyometrics) and uses a kettlebell".
// ---------------------------------------------------------------------------

interface Props {
  filters: ExerciseFilters
  onChange: (next: ExerciseFilters) => void
  /** Result counts keyed by option id, for the currently visible set. */
  counts?: Record<string, number>
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function Group({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-tr-line py-3 last:border-b-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className="mb-2 flex w-full items-center justify-between text-left" aria-expanded={open}>
        <Eyebrow>{title}</Eyebrow>
        <svg viewBox="0 0 24 24" aria-hidden className={cx('h-3.5 w-3.5 text-tr-dim transition-transform', open && 'rotate-180')}>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open ? <div className="flex flex-wrap gap-1.5">{children}</div> : null}
    </section>
  )
}

export default function FilterPanel({ filters, onChange, counts }: Props) {
  const count = activeFilterCount(filters)

  // Subcategories are scoped to whichever categories are selected.
  const subcategoryOptions = useMemo(() => {
    const cats = filters.categories.length > 0 ? CATEGORIES.filter((c) => filters.categories.includes(c.id)) : []
    return cats.flatMap((c) => c.subcategories.map((s) => ({ ...s, categoryName: c.name })))
  }, [filters.categories])

  const set = <K extends keyof ExerciseFilters>(key: K, value: ExerciseFilters[K]) => onChange({ ...filters, [key]: value })

  return (
    <div className="tr-card rounded-md px-4 py-1">
      <div className="flex items-center justify-between border-b border-tr-line py-3">
        <Eyebrow>
          Filters{count > 0 ? <span className="ml-2 text-tr-accent">{count} active</span> : null}
        </Eyebrow>
        {count > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}>
            Clear all
          </Button>
        ) : null}
      </div>

      <Group title="Category">
        {CATEGORIES.filter((c) => c.id !== 'return-to-play').map((c) => (
          <Chip
            key={c.id}
            active={filters.categories.includes(c.id)}
            count={counts?.[`category:${c.id}`]}
            onClick={() => {
              const categories = toggle<CategoryId>(filters.categories, c.id)
              // Drop subcategories that no longer belong to a selected category.
              const allowed = new Set(CATEGORIES.filter((x) => categories.includes(x.id)).flatMap((x) => x.subcategories.map((s) => s.id)))
              onChange({ ...filters, categories, subcategories: filters.subcategories.filter((s) => allowed.has(s)) })
            }}
          >
            {c.name}
          </Chip>
        ))}
      </Group>

      {subcategoryOptions.length > 0 ? (
        <Group title="Subcategory">
          {subcategoryOptions.map((s) => (
            <Chip key={`${s.categoryName}-${s.id}`} active={filters.subcategories.includes(s.id)} onClick={() => set('subcategories', toggle(filters.subcategories, s.id))}>
              {s.name}
            </Chip>
          ))}
        </Group>
      ) : null}

      <Group title="Muscle region">
        {REGIONS.map((r) => (
          <Chip
            key={r.id}
            active={filters.regions.includes(r.id)}
            count={counts?.[`region:${r.id}`]}
            onClick={() => set('regions', toggle<MuscleRegion>(filters.regions, r.id))}
          >
            {r.name}
          </Chip>
        ))}
      </Group>

      <Group title="Movement">
        {MOVEMENTS.map((mv) => (
          <Chip
            key={mv.id}
            active={filters.movements.includes(mv.id)}
            count={counts?.[`movement:${mv.id}`]}
            title={mv.description}
            onClick={() => set('movements', toggle<MovementId>(filters.movements, mv.id))}
          >
            {mv.name}
          </Chip>
        ))}
      </Group>

      <Group title="Equipment">
        {EQUIPMENT.map((e) => (
          <Chip
            key={e.id}
            active={filters.equipment.includes(e.id)}
            count={counts?.[`equipment:${e.id}`]}
            onClick={() => set('equipment', toggle<EquipmentId>(filters.equipment, e.id))}
          >
            {e.name}
          </Chip>
        ))}
      </Group>

      <Group title="Training goal">
        {TRAINING_GOALS.map((g) => (
          <Chip
            key={g.id}
            active={filters.goals.includes(g.id)}
            count={counts?.[`goal:${g.id}`]}
            onClick={() => set('goals', toggle<TrainingGoal>(filters.goals, g.id))}
          >
            {g.name}
          </Chip>
        ))}
      </Group>

      <Group title="Difficulty" defaultOpen={false}>
        {DIFFICULTIES.map((d) => (
          <Chip key={d.id} active={filters.difficulties.includes(d.id)} onClick={() => set('difficulties', toggle<Difficulty>(filters.difficulties, d.id))}>
            {d.name}
          </Chip>
        ))}
      </Group>

      <Group title="Return-to-play stage" defaultOpen={false}>
        {RTP_STAGES.map((s) => (
          <Chip key={s.id} active={filters.rtpStages.includes(s.id)} onClick={() => set('rtpStages', toggle<RtpStage>(filters.rtpStages, s.id))}>
            {s.name}
          </Chip>
        ))}
      </Group>

      <Group title="Source" defaultOpen={false}>
        <Chip active={filters.favoritesOnly} onClick={() => set('favoritesOnly', !filters.favoritesOnly)}>
          Favorites only
        </Chip>
        <Chip active={filters.customOnly} onClick={() => set('customOnly', !filters.customOnly)}>
          My exercises only
        </Chip>
      </Group>
    </div>
  )
}

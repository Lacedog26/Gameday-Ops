import { useMemo, useState } from 'react'
import { useTraining } from '../state/store'
import { EMPTY_FILTERS, filterExercises } from '../lib/search'
import { CATEGORY_BY_ID } from '../data/taxonomy'
import { SearchInput } from './ui'

// ---------------------------------------------------------------------------
// Compact exercise search used by the workout and program builders.
// ---------------------------------------------------------------------------

export default function ExercisePicker({ onPick, limit = 8 }: { onPick: (exerciseId: string) => void; limit?: number }) {
  const { exercises, data } = useTraining()
  const [query, setQuery] = useState('')

  const results = useMemo(
    () => filterExercises(exercises, { ...EMPTY_FILTERS, query }, { favorites: data.favorites.exercises }).slice(0, limit),
    [exercises, query, data.favorites.exercises, limit],
  )

  return (
    <div>
      <SearchInput value={query} onChange={setQuery} placeholder="Search an exercise to add…" ariaLabel="Search an exercise to add" />
      <div className="mt-2 space-y-1">
        {results.length === 0 ? (
          <p className="px-1 py-2 text-[12px] text-tr-dim">No exercise matches “{query}”.</p>
        ) : (
          results.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => {
                onPick(exercise.id)
                setQuery('')
              }}
              className="flex w-full items-center justify-between gap-3 rounded-[3px] border border-tr-line px-2.5 py-2 text-left transition-colors hover:border-tr-accent"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-tr-text">{exercise.name}</span>
                <span className="block truncate text-[11px] text-tr-dim">{CATEGORY_BY_ID[exercise.category]?.name}</span>
              </span>
              <span className="tr-mono shrink-0 text-[11px] text-tr-accent">Add</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { getTeam, teamsByDivision } from '../../product'
import TeamMonogram from '../common/TeamMonogram'

interface Props {
  value?: string
  onChange: (id: string) => void
  /** Team id to hide from the list (e.g. the selected team, for opponents). */
  excludeId?: string
  placeholder?: string
  /** Show a "— None —" option that clears the value. */
  allowEmpty?: boolean
}

/**
 * Searchable, conference-grouped team picker (Part 26). Replaces a 260-option
 * native <select> with type-to-filter so an operator finds their program (and
 * opponent) instantly, without scrolling the whole FBS + FCS universe.
 */
export default function TeamPicker({ value, onChange, excludeId, placeholder = 'Select team', allowEmpty }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = value ? getTeam(value) : null

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return teamsByDivision()
      .map((g) => ({
        label: g.label,
        teams: g.teams.filter(
          (t) =>
            t.id !== excludeId &&
            (!q ||
              t.name.toLowerCase().includes(q) ||
              t.shortName?.toLowerCase().includes(q) ||
              t.abbr?.toLowerCase().includes(q) ||
              g.label.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.teams.length > 0)
  }, [query, excludeId])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  const base =
    'flex w-full items-center gap-2 rounded-lg border border-white/15 bg-navy-950/80 px-3 py-2 text-left text-white outline-none transition focus:border-bills-royal focus:ring-2 focus:ring-bills-royal/40'

  return (
    <div ref={ref} className="relative">
      <button type="button" className={base} onClick={() => setOpen((o) => !o)}>
        {selected ? (
          <>
            <TeamMonogram abbr={selected.abbr} className="h-5 w-5 shrink-0" />
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <span className="ml-auto text-slate-500">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-white/15 bg-navy-900 shadow-2xl shadow-black/50">
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams or conference…"
              className="w-full rounded-md border border-white/15 bg-navy-950/80 px-3 py-2 text-sm text-white outline-none focus:border-bills-royal"
            />
          </div>
          <div className="max-h-72 overflow-y-auto pb-1">
            {allowEmpty && (
              <button type="button" onClick={() => pick('')} className="block w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/10">
                — None —
              </button>
            )}
            {groups.length === 0 && <div className="px-3 py-4 text-center text-sm text-slate-500">No matches</div>}
            {groups.map((g) => (
              <div key={g.label}>
                <div className="sticky top-0 bg-navy-900 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {g.label}
                </div>
                {g.teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pick(t.id)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/10 ${
                      t.id === value ? 'bg-bills-royal/20 text-white' : 'text-slate-200'
                    }`}
                  >
                    <TeamMonogram abbr={t.abbr} className="h-5 w-5 shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

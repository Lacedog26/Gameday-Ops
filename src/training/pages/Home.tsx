import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORIES, TRAINING_GOALS } from '../data/taxonomy'
import { MUSCLES } from '../data/muscles'
import { muscleUsageCounts } from '../data/queries'
import { useTraining } from '../state/store'
import BodyMap from '../components/anatomy/BodyMap'
import ExerciseCard from '../components/ExerciseCard'
import { Button, Card, Eyebrow, SearchInput, SectionTitle, cx } from '../components/ui'

// ---------------------------------------------------------------------------
// Home dashboard. Anatomy is the visual hero; everything else is a route into
// the four ways of entering the library: by muscle, by category, by goal, or
// by search.
// ---------------------------------------------------------------------------

const FEATURED_CATEGORIES = ['strength', 'power', 'plyometrics', 'speed', 'trunk', 'stability', 'mobility', 'return-to-play'] as const

export default function Home() {
  const navigate = useNavigate()
  const { exercises, data, exerciseById, clearRecentlyViewed } = useTraining()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'anterior' | 'posterior'>(data.settings.defaultAnatomyView)

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of exercises) map[e.category] = (map[e.category] ?? 0) + 1
    for (const e of exercises) if (e.rtpStage) map['return-to-play'] = (map['return-to-play'] ?? 0) + 1
    return map
  }, [exercises])

  const trainedMuscles = useMemo(() => muscleUsageCounts(exercises).size, [exercises])

  const recent = data.recentlyViewed.map((id) => exerciseById(id)).filter(Boolean).slice(0, 10)
  const favorites = data.favorites.exercises.map((id) => exerciseById(id)).filter(Boolean).slice(0, 4)

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate(`/train/library?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative flex flex-col justify-between overflow-hidden p-6 sm:p-8">
          <div>
            <Eyebrow className="mb-3">Welcome</Eyebrow>
            <h1 className="tr-display text-[clamp(38px,6vw,66px)] leading-[0.94] text-tr-text">
              Training
              <span className="text-tr-accent"> &amp; </span>
              Anatomy
            </h1>
            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-tr-muted">
              Go from a muscle to the exercises that train it, from an exercise to the anatomy it loads, and from a training goal to the work
              that serves it.
            </p>

            <form onSubmit={submitSearch} className="mt-6 flex max-w-xl gap-2">
              <SearchInput value={query} onChange={setQuery} placeholder="Search exercises, muscles, movements…" ariaLabel="Search the library" />
              <Button type="submit" variant="primary" className="shrink-0">
                Search
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              <Stat value={exercises.length} label="Exercises" />
              <Stat value={MUSCLES.length} label="Muscles mapped" />
              <Stat value={trainedMuscles} label="Muscles with exercises" />
              <Stat value={CATEGORIES.length} label="Categories" />
            </div>
          </div>

          <div className="mt-8 border-t border-tr-line pt-5">
            <Eyebrow className="mb-2.5">Start from a training goal</Eyebrow>
            <div className="flex flex-wrap gap-1.5">
              {TRAINING_GOALS.map((goal) => (
                <Link
                  key={goal.id}
                  to={`/train/library?goal=${goal.id}`}
                  className="rounded-[3px] border border-tr-line px-2.5 py-1 text-[12px] text-tr-muted transition-colors hover:border-tr-accent hover:text-tr-accent"
                >
                  {goal.name}
                </Link>
              ))}
            </div>
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-tr-line px-4 py-2.5">
            <Eyebrow>Anatomy</Eyebrow>
            <div className="flex gap-1">
              {(['anterior', 'posterior'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cx(
                    'rounded-[3px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
                    view === v ? 'bg-tr-accent text-[#04120E]' : 'text-tr-muted hover:bg-tr-hi hover:text-tr-text',
                  )}
                >
                  {v === 'anterior' ? 'Front' : 'Back'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-h-[300px] flex-1 items-center justify-center bg-[#080B11] p-4">
            <BodyMap view={view} intensity={data.settings.highlightIntensity} className="max-h-[380px]" />
          </div>
          <div className="border-t border-tr-line p-3">
            <Link to="/train/anatomy">
              <Button variant="outline" className="w-full">
                Open the anatomy viewer
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Primary routes in */}
      <section className="grid gap-4 sm:grid-cols-3">
        <BigTile to="/train/anatomy" title="Explore Anatomy" body="Select muscles on the body map, toggle layers and isolate what you want to study." />
        <BigTile to="/train/library" title="Explore Exercises" body="Search and filter the full library by muscle, movement, equipment and goal." />
        <BigTile to="/train/muscles" title="Muscle Explorer" body="Anatomy, function and every exercise that trains a given muscle." />
      </section>

      {/* Categories */}
      <section>
        <SectionTitle hint="Each category carries its own subcategories, so you can drill from a quality down to a specific pattern.">
          Movement Categories
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_CATEGORIES.map((id) => {
            const category = CATEGORIES.find((c) => c.id === id)!
            return (
              <Link key={id} to={`/train/categories/${id}`} className="tr-card tr-card-hover group rounded-md p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="tr-display text-[18px] leading-tight text-tr-text group-hover:text-tr-accent">{category.name}</h3>
                  <span className="tr-mono text-[11px] text-tr-dim">{counts[id] ?? 0}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-[12.5px] leading-snug text-tr-muted">{category.blurb}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {category.subcategories.slice(0, 3).map((s) => (
                    <span key={s.id} className="rounded-[2px] border border-tr-line px-1.5 py-[2px] text-[10.5px] text-tr-dim">
                      {s.name}
                    </span>
                  ))}
                  {category.subcategories.length > 3 ? <span className="px-1 text-[10.5px] text-tr-dim">+{category.subcategories.length - 3}</span> : null}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Favorites */}
      <section>
        <SectionTitle actions={<Link to="/train/favorites" className="text-[12px] text-tr-accent hover:underline">View all</Link>}>Favorites</SectionTitle>
        {favorites.length === 0 ? (
          <Card className="px-5 py-8 text-center">
            <p className="text-[13px] text-tr-muted">No favorites yet. Tap the heart on any exercise or muscle to pin it here.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((e) => (
              <ExerciseCard key={e!.id} exercise={e!} />
            ))}
          </div>
        )}
      </section>

      {/* Recently viewed */}
      <section>
        <SectionTitle
          hint="The last ten exercises you opened, stored on this device."
          actions={
            recent.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={clearRecentlyViewed}>
                Clear history
              </Button>
            ) : null
          }
        >
          Recently Viewed
        </SectionTitle>
        {recent.length === 0 ? (
          <Card className="px-5 py-8 text-center">
            <p className="text-[13px] text-tr-muted">Nothing viewed yet — open an exercise and it will show up here.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recent.map((e) => (
              <ExerciseCard key={e!.id} exercise={e!} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="tr-display text-[26px] leading-none text-tr-accent">{value}</div>
      <div className="tr-eyebrow mt-1.5 text-tr-dim">{label}</div>
    </div>
  )
}

function BigTile({ to, title, body }: { to: string; title: string; body: string }) {
  return (
    <Link to={to} className="tr-card tr-card-hover group flex flex-col justify-between rounded-md p-5">
      <div>
        <h3 className="tr-display text-[21px] leading-tight text-tr-text group-hover:text-tr-accent">{title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-tr-muted">{body}</p>
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-tr-accent">
        Open
        <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">
          <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  )
}

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { CategoryId, RtpStage } from '../data/types'
import { CATEGORIES, CATEGORY_BY_ID, RTP_STAGES } from '../data/taxonomy'
import { useTraining } from '../state/store'
import ExerciseCard from '../components/ExerciseCard'
import { Button, Card, Chip, EmptyState, Eyebrow, PageHeader, SectionTitle } from '../components/ui'

// ---------------------------------------------------------------------------
// Category index and category detail.
//
// Return to play is handled differently on purpose: it is a staging label
// applied across the library rather than a bucket exercises live in, so its
// page groups by stage instead of by subcategory.
// ---------------------------------------------------------------------------

export function CategoryIndex() {
  const { exercises } = useTraining()

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of exercises) {
      map[e.category] = (map[e.category] ?? 0) + 1
      if (e.rtpStage) map['return-to-play'] = (map['return-to-play'] ?? 0) + 1
    }
    return map
  }, [exercises])

  return (
    <div>
      <PageHeader
        eyebrow="Movement Categories"
        title="Movement Categories"
        subtitle="Eight training qualities, each broken into the subcategories that actually get programmed."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map((category) => (
          <Link key={category.id} to={`/train/categories/${category.id}`} className="tr-card tr-card-hover group rounded-md p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="tr-display text-[24px] leading-tight text-tr-text group-hover:text-tr-accent">{category.name}</h2>
              <span className="tr-mono shrink-0 text-[12px] text-tr-dim">{counts[category.id] ?? 0}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-tr-muted">{category.blurb}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {category.subcategories.map((s) => (
                <span key={s.id} className="rounded-[2px] border border-tr-line px-2 py-[3px] text-[11px] text-tr-dim">
                  {s.name}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function CategoryDetail() {
  const { id } = useParams<{ id: string }>()
  const { exercises } = useTraining()
  const [subcategory, setSubcategory] = useState<string | null>(null)

  const category = id ? CATEGORY_BY_ID[id as CategoryId] : undefined

  const inCategory = useMemo(() => {
    if (!category) return []
    if (category.id === 'return-to-play') return exercises.filter((e) => e.rtpStage)
    return exercises.filter((e) => e.category === category.id)
  }, [exercises, category])

  const subCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of inCategory) {
      const key = category?.id === 'return-to-play' ? (e.rtpStage as string) : e.subcategory
      if (key) map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [inCategory, category])

  if (!category) {
    return (
      <EmptyState
        title="Category not found"
        action={
          <Link to="/train/categories">
            <Button variant="outline">All categories</Button>
          </Link>
        }
      />
    )
  }

  const isRtp = category.id === 'return-to-play'
  const options = isRtp ? RTP_STAGES : category.subcategories

  const visible = subcategory
    ? inCategory.filter((e) => (isRtp ? e.rtpStage === (subcategory as RtpStage) : e.subcategory === subcategory))
    : inCategory

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-[12px] text-tr-dim">
        <Link to="/train/categories" className="hover:text-tr-accent">
          Categories
        </Link>
        <span>/</span>
        <span className="text-tr-muted">{category.name}</span>
      </nav>

      <PageHeader eyebrow="Category" title={category.name} subtitle={category.blurb} />

      {isRtp ? (
        <Card className="mb-5 p-4">
          <Eyebrow className="mb-2">How this category works</Eyebrow>
          <p className="text-[13px] leading-relaxed text-tr-muted">
            Return-to-play stages are a way of sequencing training complexity, not a medical clearance system. Any exercise in the library can
            carry a stage, so a lift can be both a strength entry and an intermediate-stage entry at the same time. Nothing here diagnoses,
            assesses or clears anyone to return to sport.
          </p>
        </Card>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-1.5">
        <Chip active={subcategory === null} onClick={() => setSubcategory(null)} count={inCategory.length}>
          All
        </Chip>
        {options.map((s) => (
          <Chip key={s.id} active={subcategory === s.id} onClick={() => setSubcategory(s.id)} count={subCounts[s.id] ?? 0}>
            {s.name}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="No exercise in the library carries this subcategory. Add one and it will appear here immediately."
          action={
            <Link to="/train/exercise/new">
              <Button variant="primary">Add an exercise</Button>
            </Link>
          }
        />
      ) : (
        <>
          <SectionTitle>
            {visible.length} {visible.length === 1 ? 'exercise' : 'exercises'}
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {visible.map((e) => (
              <ExerciseCard key={e.id} exercise={e} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

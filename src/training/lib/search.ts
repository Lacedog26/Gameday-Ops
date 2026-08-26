import type { CategoryId, Difficulty, EquipmentId, Exercise, MovementId, MuscleRegion, RtpStage, TrainingGoal } from '../data/types'
import { MUSCLE_BY_ID } from '../data/muscles'
import { CATEGORY_BY_ID, EQUIPMENT_NAME, GOAL_NAME, MOVEMENT_BY_ID } from '../data/taxonomy'
import { muscleHighlightMap } from '../data/queries'

// ---------------------------------------------------------------------------
// Search + filtering.
//
// Search runs over a pre-built haystack per exercise (name, category, muscles,
// movement, equipment, goals, tags) so a query like "posterior chain" or
// "glute" or "single leg" hits regardless of which field it lives in.
// ---------------------------------------------------------------------------

export interface ExerciseFilters {
  query: string
  categories: CategoryId[]
  subcategories: string[]
  regions: MuscleRegion[]
  muscles: string[]
  movements: MovementId[]
  equipment: EquipmentId[]
  goals: TrainingGoal[]
  difficulties: Difficulty[]
  rtpStages: RtpStage[]
  favoritesOnly: boolean
  customOnly: boolean
}

export const EMPTY_FILTERS: ExerciseFilters = {
  query: '',
  categories: [],
  subcategories: [],
  regions: [],
  muscles: [],
  movements: [],
  equipment: [],
  goals: [],
  difficulties: [],
  rtpStages: [],
  favoritesOnly: false,
  customOnly: false,
}

export function activeFilterCount(f: ExerciseFilters): number {
  return (
    f.categories.length +
    f.subcategories.length +
    f.regions.length +
    f.muscles.length +
    f.movements.length +
    f.equipment.length +
    f.goals.length +
    f.difficulties.length +
    f.rtpStages.length +
    (f.favoritesOnly ? 1 : 0) +
    (f.customOnly ? 1 : 0)
  )
}

/** Everything about an exercise, flattened to lowercase text for matching. */
function buildHaystack(exercise: Exercise): string {
  const parts: string[] = [
    exercise.name,
    exercise.description,
    CATEGORY_BY_ID[exercise.category]?.name ?? exercise.category,
    CATEGORY_BY_ID[exercise.category]?.subcategories.find((s) => s.id === exercise.subcategory)?.name ?? exercise.subcategory,
    exercise.difficulty,
    ...exercise.tags,
    ...exercise.movementPattern.map((id) => MOVEMENT_BY_ID[id]?.name ?? id),
    ...exercise.equipment.map((id) => EQUIPMENT_NAME[id] ?? id),
    ...exercise.trainingGoals.map((id) => GOAL_NAME[id] ?? id),
    ...exercise.athleticApplications,
    ...exercise.coachingCues,
  ]
  for (const id of muscleHighlightMap(exercise).keys()) {
    const muscle = MUSCLE_BY_ID[id]
    if (muscle) parts.push(muscle.name, muscle.group, muscle.region, ...muscle.actions)
  }
  if (exercise.rtpStage) parts.push('return to play', exercise.rtpStage)
  return parts.join(' \n ').toLowerCase()
}

const haystackCache = new WeakMap<Exercise, string>()

function haystackFor(exercise: Exercise): string {
  let cached = haystackCache.get(exercise)
  if (cached === undefined) {
    cached = buildHaystack(exercise)
    haystackCache.set(exercise, cached)
  }
  return cached
}

/**
 * Score an exercise against a query. Returns 0 when it does not match.
 * All whitespace-separated terms must appear somewhere (AND semantics), which
 * is what makes multi-word searches like "single leg plyometric" behave.
 */
function scoreQuery(exercise: Exercise, query: string): number {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 1

  const hay = haystackFor(exercise)
  const name = exercise.name.toLowerCase()
  let score = 0

  for (const term of terms) {
    if (!hay.includes(term)) return 0
    if (name.startsWith(term)) score += 10
    else if (name.includes(term)) score += 6
    else if (exercise.tags.some((t) => t.toLowerCase().includes(term))) score += 3
    else score += 1
  }
  // Whole-phrase name match wins outright.
  if (name.includes(query.trim().toLowerCase())) score += 12
  return score
}

const hasAny = <T,>(selected: T[], values: T[]) => selected.length === 0 || values.some((v) => selected.includes(v))

export interface FilterContext {
  favorites: string[]
}

export function filterExercises(exercises: Exercise[], filters: ExerciseFilters, ctx: FilterContext): Exercise[] {
  const favorites = new Set(ctx.favorites)

  const scored: { exercise: Exercise; score: number }[] = []

  for (const exercise of exercises) {
    if (filters.favoritesOnly && !favorites.has(exercise.id)) continue
    if (filters.customOnly && !exercise.custom) continue
    if (!hasAny(filters.categories, [exercise.category])) continue
    if (!hasAny(filters.subcategories, [exercise.subcategory])) continue
    if (!hasAny(filters.movements, exercise.movementPattern)) continue
    if (!hasAny(filters.equipment, exercise.equipment)) continue
    if (!hasAny(filters.goals, exercise.trainingGoals)) continue
    if (!hasAny(filters.difficulties, [exercise.difficulty])) continue
    if (filters.rtpStages.length > 0 && (!exercise.rtpStage || !filters.rtpStages.includes(exercise.rtpStage))) continue

    if (filters.regions.length > 0 || filters.muscles.length > 0) {
      const ids = [...muscleHighlightMap(exercise).keys()]
      if (filters.muscles.length > 0 && !ids.some((id) => filters.muscles.includes(id))) continue
      if (filters.regions.length > 0) {
        const regions = ids.map((id) => MUSCLE_BY_ID[id]?.region).filter(Boolean) as MuscleRegion[]
        if (!regions.some((r) => filters.regions.includes(r))) continue
      }
    }

    const score = scoreQuery(exercise, filters.query)
    if (score === 0) continue
    scored.push({ exercise, score })
  }

  const searching = filters.query.trim().length > 0
  scored.sort((a, b) => (searching ? b.score - a.score || a.exercise.name.localeCompare(b.exercise.name) : a.exercise.name.localeCompare(b.exercise.name)))
  return scored.map((s) => s.exercise)
}

/** Lightweight muscle search for the Muscle Explorer list. */
export function searchMuscles<T extends { name: string; group: string; region: string; actions: string[]; latinName?: string }>(
  muscles: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return muscles
  const terms = q.split(/\s+/).filter(Boolean)
  return muscles.filter((m) => {
    const hay = [m.name, m.group, m.region, m.latinName ?? '', ...m.actions].join(' ').toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}

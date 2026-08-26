import type { Exercise, Muscle, MuscleRef, MuscleRole, RtpStage } from './types'
import { MUSCLE_BY_ID } from './muscles'

// ---------------------------------------------------------------------------
// Derived views over the data. Pure functions, no React, no storage — so they
// can be reused by a future AI query layer, an export script or a test.
// ---------------------------------------------------------------------------

export interface ResolvedMuscle {
  muscle: Muscle
  role: MuscleRole
  emphasis: number
}

/** All muscles an exercise touches, resolved and ordered by role then emphasis. */
export function resolveExerciseMuscles(exercise: Exercise): ResolvedMuscle[] {
  const out: ResolvedMuscle[] = []
  const push = (refs: MuscleRef[], role: MuscleRole) => {
    for (const ref of refs) {
      const muscle = MUSCLE_BY_ID[ref.muscleId]
      // Unknown ids are skipped rather than crashing the page — user-created
      // exercises can reference muscles that were renamed or removed.
      if (muscle) out.push({ muscle, role, emphasis: ref.emphasis })
    }
  }
  push(exercise.primaryMuscles, 'primary')
  push(exercise.secondaryMuscles, 'secondary')
  push(exercise.stabilizers, 'stabilizer')
  return out
}

const ROLE_RANK: Record<MuscleRole, number> = { primary: 0, secondary: 1, stabilizer: 2 }

/**
 * Muscle id -> strongest role + emphasis for an exercise.
 *
 * A muscle listed in two buckets (which happens with editorial data) resolves
 * to its most significant role so the anatomy never paints it twice.
 */
export function muscleHighlightMap(exercise: Exercise): Map<string, { role: MuscleRole; emphasis: number }> {
  const map = new Map<string, { role: MuscleRole; emphasis: number }>()
  for (const { muscle, role, emphasis } of resolveExerciseMuscles(exercise)) {
    const existing = map.get(muscle.id)
    if (!existing || ROLE_RANK[role] < ROLE_RANK[existing.role]) {
      map.set(muscle.id, { role, emphasis })
    }
  }
  return map
}

export interface MuscleExerciseHit {
  exercise: Exercise
  role: MuscleRole
  emphasis: number
}

/** Every exercise that trains a given muscle, strongest role and emphasis first. */
export function exercisesForMuscle(exercises: Exercise[], muscleId: string): MuscleExerciseHit[] {
  const hits: MuscleExerciseHit[] = []
  for (const exercise of exercises) {
    const found = muscleHighlightMap(exercise).get(muscleId)
    if (found) hits.push({ exercise, role: found.role, emphasis: found.emphasis })
  }
  return hits.sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || b.emphasis - a.emphasis)
}

/**
 * Which side of the body shows most of an exercise's primary work.
 *
 * Used to open the anatomy on the useful side — a Romanian deadlift should not
 * land on the anterior view.
 */
export function dominantAnatomyView(exercise: Exercise, fallback: 'anterior' | 'posterior' = 'anterior'): 'anterior' | 'posterior' {
  let anterior = 0
  let posterior = 0
  for (const ref of exercise.primaryMuscles) {
    const muscle = MUSCLE_BY_ID[ref.muscleId]
    if (!muscle) continue
    if (muscle.view === 'anterior') anterior += ref.emphasis
    else if (muscle.view === 'posterior') posterior += ref.emphasis
    else {
      anterior += ref.emphasis / 2
      posterior += ref.emphasis / 2
    }
  }
  if (anterior === posterior) return fallback
  return anterior > posterior ? 'anterior' : 'posterior'
}

/** Exercises assigned to a return-to-play stage. */
export function exercisesForRtpStage(exercises: Exercise[], stage: RtpStage): Exercise[] {
  return exercises.filter((e) => e.rtpStage === stage)
}

/** Every muscle that appears in the library, with how many exercises train it. */
export function muscleUsageCounts(exercises: Exercise[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const exercise of exercises) {
    for (const id of muscleHighlightMap(exercise).keys()) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  return counts
}

/**
 * Related exercises for a detail page.
 *
 * Explicit `relatedExercises` come first, then anything sharing a primary
 * muscle, so the list is never empty for a well-formed entry.
 */
export function relatedExercises(exercises: Exercise[], exercise: Exercise, limit = 6): Exercise[] {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const picked: Exercise[] = []
  const seen = new Set<string>([exercise.id])

  for (const id of exercise.relatedExercises ?? []) {
    const found = byId.get(id)
    if (found && !seen.has(found.id)) {
      picked.push(found)
      seen.add(found.id)
    }
  }
  if (picked.length >= limit) return picked.slice(0, limit)

  const primaryIds = new Set(exercise.primaryMuscles.map((r) => r.muscleId))
  const scored = exercises
    .filter((e) => !seen.has(e.id))
    .map((e) => ({
      exercise: e,
      score: e.primaryMuscles.filter((r) => primaryIds.has(r.muscleId)).length + (e.category === exercise.category ? 0.5 : 0),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  for (const { exercise: e } of scored) {
    if (picked.length >= limit) break
    picked.push(e)
    seen.add(e.id)
  }
  return picked
}

/**
 * Resolve a progression/regression entry, which may be an exercise id or free
 * text describing something not yet in the library.
 */
export function resolveExerciseRef(exercises: Exercise[], value: string): { exercise?: Exercise; text: string } {
  const found = exercises.find((e) => e.id === value)
  return found ? { exercise: found, text: found.name } : { text: value }
}

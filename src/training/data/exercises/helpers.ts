import type { MuscleRef } from '../types'

/**
 * Shorthand for a muscle reference.
 *
 * The number is a TRAINING EMPHASIS weighting (0–100) — a coaching judgement
 * about how much of the exercise's demand lands on that muscle. It is not an
 * EMG measurement and the UI never presents it as one.
 */
export const m = (muscleId: string, emphasis: number): MuscleRef => ({ muscleId, emphasis })

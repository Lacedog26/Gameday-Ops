import type { Exercise } from '../types'
import { STRENGTH_EXERCISES } from './strength'
import { POWER_EXERCISES } from './power'
import { PLYOMETRIC_EXERCISES } from './plyometrics'
import { SPEED_EXERCISES } from './speed'
import { TRUNK_EXERCISES } from './trunk'
import { STABILITY_EXERCISES } from './stability'
import { MOBILITY_EXERCISES } from './mobility'

/**
 * The built-in exercise library.
 *
 * Adding exercises means adding to (or adding another) data file here — no UI
 * component needs to change. User-created exercises are merged on top of this
 * list at runtime by the store, so the library scales the same way whether
 * entries ship with the app or are added by hand.
 *
 * Note: there is no separate `return-to-play` data file. Return-to-play is a
 * staging label (`rtpStage`) applied across the whole library, so a single
 * exercise can be both a strength lift and an intermediate-stage entry.
 */
export const BUILT_IN_EXERCISES: Exercise[] = [
  ...STRENGTH_EXERCISES,
  ...POWER_EXERCISES,
  ...PLYOMETRIC_EXERCISES,
  ...SPEED_EXERCISES,
  ...TRUNK_EXERCISES,
  ...STABILITY_EXERCISES,
  ...MOBILITY_EXERCISES,
]

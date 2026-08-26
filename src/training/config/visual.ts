import type { MuscleRole } from '../data/types'

// ---------------------------------------------------------------------------
// Anatomy highlight configuration.
//
// THIS IS THE ONE PLACE that decides how muscle roles look. The 2D body map,
// the role legends, the exercise detail chips and (in Phase 2) the 3D material
// system all read from here, so changing a colour or an intensity here changes
// it everywhere at once.
// ---------------------------------------------------------------------------

export interface RoleStyle {
  /** Human label used in legends. */
  label: string
  /** Base colour, hex. */
  color: string
  /** Fill opacity applied on the anatomy at emphasis = 100. */
  fillOpacity: number
  /** Outline opacity applied on the anatomy at emphasis = 100. */
  strokeOpacity: number
  /** Glow radius in SVG user units / world units. */
  glow: number
  /** Short explanation shown in the legend tooltip. */
  hint: string
}

export const ROLE_STYLES: Record<MuscleRole, RoleStyle> = {
  primary: {
    label: 'Primary',
    color: '#FF4D3D',
    fillOpacity: 0.92,
    strokeOpacity: 1,
    glow: 6,
    hint: 'Prime movers — the muscles producing most of the force.',
  },
  secondary: {
    label: 'Secondary',
    color: '#FFA53D',
    fillOpacity: 0.66,
    strokeOpacity: 0.85,
    glow: 3,
    hint: 'Meaningful contributors that assist the prime movers.',
  },
  stabilizer: {
    label: 'Stabilizer',
    color: '#4DD4FF',
    fillOpacity: 0.44,
    strokeOpacity: 0.7,
    glow: 2,
    hint: 'Muscles holding position so force can be transmitted.',
  },
}

export const ROLE_ORDER: MuscleRole[] = ['primary', 'secondary', 'stabilizer']

/** Colour of an unhighlighted muscle region. */
export const ANATOMY_BASE = {
  /** Muscle body fill when nothing is selected. */
  muscleFill: '#2A3348',
  /** Muscle outline. */
  muscleStroke: '#3E4A66',
  /** Silhouette / skin layer. */
  skinFill: '#161C2B',
  skinStroke: '#2C3650',
  /** Skeleton layer. */
  boneFill: '#59617A',
  boneStroke: '#79839E',
  /** Dimming applied to non-involved muscles when an exercise is loaded. */
  dimOpacity: 0.35,
  /** Colour used when the user selects a single muscle in the explorer. */
  selection: '#B4F5FF',
} as const

/**
 * Map a role + emphasis (0–100) to concrete paint values.
 *
 * `intensity` is the user's global highlight-intensity setting (0.4–1.4), so a
 * viewer can turn the whole visual language up or down without touching data.
 */
export function paintFor(role: MuscleRole, emphasis: number, intensity = 1) {
  const style = ROLE_STYLES[role]
  // Emphasis never fully mutes a muscle — a listed muscle is always visible.
  const scale = 0.55 + 0.45 * (Math.max(0, Math.min(100, emphasis)) / 100)
  return {
    color: style.color,
    fillOpacity: clamp01(style.fillOpacity * scale * intensity),
    strokeOpacity: clamp01(style.strokeOpacity * scale * intensity),
    glow: style.glow * scale * intensity,
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

/**
 * The label used anywhere an emphasis number is shown.
 *
 * These numbers are editorial coaching weightings, not measured EMG values, and
 * the UI is required to say so.
 */
export const EMPHASIS_LABEL = 'Training emphasis'
export const EMPHASIS_DISCLAIMER =
  'Training emphasis is an editorial coaching weighting used to drive the anatomy visuals. It is not a measured EMG value.'

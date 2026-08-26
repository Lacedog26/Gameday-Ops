import type { AnatomyView } from '../../data/types'

// ---------------------------------------------------------------------------
// 2D body map geometry — original artwork authored for this app.
//
// This is the Phase 1 anatomy target. Every region id here is also referenced
// by `Muscle.bodyMapRegions`, and every muscle additionally carries an
// `anatomyModelId` naming the mesh it will bind to in a real 3D model. The
// viewer component is written against that indirection, so swapping in a GLB
// anatomy model in Phase 2 does not require touching muscle or exercise data.
//
// Coordinate space: viewBox "0 0 300 600", figure centred on x = 150. Every
// path below describes the LEFT half of the figure and is drawn twice — once
// as authored, once mirrored — so the body stays symmetric and a region always
// highlights on both sides.
// ---------------------------------------------------------------------------

export const BODY_VIEWBOX = '0 0 300 600'

const MIRROR_AXIS = 300

export interface BodyRegion {
  id: string
  label: string
  view: AnatomyView
  path: string
}

/** Base silhouette, shared by both views. */
export const BODY_SILHOUETTE = {
  head: 'M150 12c17 0 29 15 29 33 0 20-12 33-29 33s-29-13-29-33c0-18 12-33 29-33z',
  neck: 'M134 68c1 12 0 19-5 25h42c-5-6-6-13-5-25z',
  torso:
    'M150 92c18 0 32 4 42 12 8 8 11 24 9 42-2 20-6 36-10 50-4 14-6 26-6 34h-70c0-8-2-20-6-34-4-14-8-30-10-50-2-18 1-34 9-42 10-8 24-12 42-12z',
  pelvis: 'M115 228h70c2 18 0 35-7 49-6 12-16 19-28 19s-22-7-28-19c-7-14-9-31-7-49z',
  upperArmL:
    'M110 100c-13 3-23 13-27 28-4 16-6 36-6 54 0 14 1 26 2 36l23-2c-1-11-2-25-2-39 0-17 2-34 6-45 3-9 4-19 4-32z',
  forearmL: 'M77 222c-1 15-2 31-2 47 0 17 1 31 3 43l20-2c-2-12-3-26-3-42 0-16 1-31 3-44z',
  handL: 'M78 314c-2 12-3 24-1 32 2 9 8 13 13 11 5-2 8-11 8-21 0-9 0-18-1-26z',
  thighL:
    'M113 274c-4 20-6 44-6 68 0 22 2 41 5 55l30-1c1-16 2-36 2-58 0-24-1-45-3-65z',
  shinL: 'M111 404c-2 18-3 38-3 58 0 22 2 40 4 52l25-1c1-13 2-31 2-52 0-20 0-40-1-58z',
  footL: 'M111 520h25c1 10 3 18 7 22 3 4 1 8-5 8h-25c-5 0-7-4-5-9 2-6 3-13 3-21z',
} as const

/**
 * Anterior regions. Shapes are hand-authored to follow the muscle bellies
 * rather than boxing them, so the figure reads as anatomy rather than as a
 * segmented mannequin.
 */
export const ANTERIOR_REGIONS: BodyRegion[] = [
  {
    id: 'a-neck',
    label: 'Neck',
    view: 'anterior',
    path: 'M136 70c1 11 0 18-4 23l14 1V70z',
  },
  {
    id: 'a-trap',
    label: 'Upper trapezius (front)',
    view: 'anterior',
    path: 'M135 94c-11 2-20 6-27 12 8 4 15 9 21 15 3-9 4-18 6-27z',
  },
  {
    id: 'a-delt-ant',
    label: 'Anterior deltoid',
    view: 'anterior',
    path: 'M110 100c-12 3-21 13-25 27-3 11-5 23-5 34l21-2c0-10 1-21 4-30 3-10 5-19 5-29z',
  },
  {
    id: 'a-delt-lat',
    label: 'Lateral deltoid',
    view: 'anterior',
    path: 'M85 127c-4 12-6 26-6 39 0 10 0 19 1 27l12-1c-1-9-1-19-1-29 0-12 1-24 4-33z',
  },
  {
    id: 'a-pec',
    label: 'Pectoralis',
    view: 'anterior',
    path: 'M148 104c-16 1-29 5-38 13-4 12-5 27-4 41 13-5 27-8 42-9z',
  },
  {
    id: 'a-serratus',
    label: 'Serratus anterior',
    view: 'anterior',
    path: 'M107 162c1 12 4 23 7 33 5-3 11-5 17-6-2-10-3-20-3-30-7 1-14 2-21 3z',
  },
  {
    id: 'a-abs',
    label: 'Rectus abdominis',
    view: 'anterior',
    path: 'M148 152c-6 1-12 2-17 4-3 24-4 51-3 74l20 1z',
  },
  {
    id: 'a-oblique',
    label: 'Obliques',
    view: 'anterior',
    path: 'M112 160c1 24 4 47 9 68l7 1c-4-23-6-49-5-72-4 1-8 2-11 3z',
  },
  {
    id: 'a-hipflexor',
    label: 'Hip flexors',
    view: 'anterior',
    path: 'M126 234c2 14 6 26 12 36l10 1v-37z',
  },
  {
    id: 'a-tfl',
    label: 'Tensor fasciae latae',
    view: 'anterior',
    path: 'M112 230c1 13 4 24 9 33l6-5c-4-8-6-17-7-27z',
  },
  {
    id: 'a-adductor',
    label: 'Adductors',
    view: 'anterior',
    path: 'M131 276c-2 21-3 44-2 64l17 4v-70z',
  },
  {
    id: 'a-quad',
    label: 'Quadriceps',
    view: 'anterior',
    path: 'M114 278c-4 21-6 45-6 68 0 20 2 37 4 50l22-2c-1-15-2-33-2-53 0-23-1-44-3-63z',
  },
  {
    id: 'a-bicep',
    label: 'Biceps / brachialis',
    view: 'anterior',
    path: 'M87 132c-3 16-4 35-4 52 0 12 1 23 2 32l17-2c-1-10-2-23-2-37 0-16 2-31 5-42z',
  },
  {
    id: 'a-forearm',
    label: 'Forearm (anterior)',
    view: 'anterior',
    path: 'M80 224c-2 15-3 31-3 46 0 15 1 28 3 39l16-2c-2-11-3-24-3-38 0-15 1-30 3-43z',
  },
  {
    id: 'a-tib',
    label: 'Tibialis anterior',
    view: 'anterior',
    path: 'M116 410c-2 19-3 40-3 60 0 18 1 33 3 42l16-1c-1-10-2-24-2-41 0-21 0-41-1-59z',
  },
]

export const POSTERIOR_REGIONS: BodyRegion[] = [
  {
    id: 'p-neck',
    label: 'Neck (posterior)',
    view: 'posterior',
    path: 'M136 70c1 11 0 18-4 23l14 1V70z',
  },
  {
    id: 'p-trap-upper',
    label: 'Upper trapezius',
    view: 'posterior',
    path: 'M150 90c-16 1-30 5-40 13-4 3-7 7-9 11 15-4 32-6 49-6z',
  },
  {
    id: 'p-trap-mid',
    label: 'Middle / lower trapezius',
    view: 'posterior',
    path: 'M150 112c-15 0-29 2-40 6 0 20 4 44 11 65 9 3 19 5 29 6z',
  },
  {
    id: 'p-delt-post',
    label: 'Posterior deltoid',
    view: 'posterior',
    path: 'M110 100c-12 3-21 13-25 27-3 11-5 23-5 34l21-2c0-10 1-21 4-30 3-10 5-19 5-29z',
  },
  {
    id: 'p-delt-lat',
    label: 'Lateral deltoid',
    view: 'posterior',
    path: 'M85 127c-4 12-6 26-6 39 0 10 0 19 1 27l12-1c-1-9-1-19-1-29 0-12 1-24 4-33z',
  },
  {
    id: 'p-rotator',
    label: 'Rotator cuff',
    view: 'posterior',
    path: 'M118 118c-2 13-1 27 2 39 6 2 13 4 20 5-2-15-3-30-3-44-7 0-13 0-19 0z',
  },
  {
    id: 'p-lat',
    label: 'Latissimus dorsi',
    view: 'posterior',
    path: 'M107 140c-1 20 1 42 7 61 4 13 9 24 15 33 5-4 10-7 15-9-7-16-12-36-15-58-8-8-16-18-22-27z',
  },
  {
    id: 'p-erector',
    label: 'Spinal extensors',
    view: 'posterior',
    path: 'M148 112c-4 0-8 1-11 2-3 39-3 82-1 118l12 1z',
  },
  {
    id: 'p-tricep',
    label: 'Triceps',
    view: 'posterior',
    path: 'M87 132c-3 16-4 35-4 52 0 12 1 23 2 32l17-2c-1-10-2-23-2-37 0-16 2-31 5-42z',
  },
  {
    id: 'p-forearm',
    label: 'Forearm (posterior)',
    view: 'posterior',
    path: 'M80 224c-2 15-3 31-3 46 0 15 1 28 3 39l16-2c-2-11-3-24-3-38 0-15 1-30 3-43z',
  },
  {
    id: 'p-glute-med',
    label: 'Gluteus medius / minimus',
    view: 'posterior',
    path: 'M111 230c1 13 4 25 9 34l8-6c-4-9-6-19-7-29z',
  },
  {
    id: 'p-glute-max',
    label: 'Gluteus maximus',
    view: 'posterior',
    path: 'M122 232c2 19 6 36 14 48 5 7 10 11 14 13v-61z',
  },
  {
    id: 'p-hamstring',
    label: 'Hamstrings',
    view: 'posterior',
    path: 'M114 278c-4 21-6 45-6 68 0 20 2 36 4 49l22-2c-1-14-2-32-2-51 0-23-1-44-3-64z',
  },
  {
    id: 'p-calf',
    label: 'Calf complex',
    view: 'posterior',
    path: 'M115 410c-2 17-3 36-3 55 0 16 1 30 4 39l17-1c-1-10-2-23-2-38 0-19 0-37-1-54z',
  },
]

export const ALL_REGIONS = [...ANTERIOR_REGIONS, ...POSTERIOR_REGIONS]

export const REGION_BY_ID: Record<string, BodyRegion> = Object.fromEntries(ALL_REGIONS.map((r) => [r.id, r]))

export function regionsForView(view: 'anterior' | 'posterior'): BodyRegion[] {
  return view === 'anterior' ? ANTERIOR_REGIONS : POSTERIOR_REGIONS
}

/** Transform that mirrors a left-side shape onto the right side of the figure. */
export const MIRROR_TRANSFORM = `translate(${MIRROR_AXIS}, 0) scale(-1, 1)`

/**
 * Simplified skeleton, drawn as strokes when the "Bones" layer is on. This is a
 * schematic reference, not an anatomically exact skeleton.
 */
export const SKELETON_PATHS: string[] = [
  // Spine
  'M150 80v148',
  // Clavicles
  'M150 104l-32 6M150 104l32 6',
  // Ribcage
  'M150 116c-14 2-24 11-27 24M150 116c14 2 24 11 27 24',
  'M150 134c-16 2-27 12-30 25M150 134c16 2 27 12 30 25',
  'M150 154c-15 2-25 11-28 23M150 154c15 2 25 11 28 23',
  // Pelvis
  'M118 232c-2 18 4 33 14 42M182 232c2 18-4 33-14 42',
  'M118 234h64',
  // Humerus
  'M98 112l-9 106M202 112l9 106',
  // Radius / ulna
  'M88 224l-6 88M212 224l6 88',
  // Femur
  'M130 272l-4 130M170 272l4 130',
  // Tibia / fibula
  'M127 410l-2 108M173 410l2 108',
]

/** Major joint markers, drawn when the "Joints" layer is on. */
export const JOINT_MARKERS: { cx: number; cy: number; r: number; label: string }[] = [
  { cx: 99, cy: 113, r: 7, label: 'Shoulder' },
  { cx: 201, cy: 113, r: 7, label: 'Shoulder' },
  { cx: 88, cy: 220, r: 5.5, label: 'Elbow' },
  { cx: 212, cy: 220, r: 5.5, label: 'Elbow' },
  { cx: 82, cy: 312, r: 4.5, label: 'Wrist' },
  { cx: 218, cy: 312, r: 4.5, label: 'Wrist' },
  { cx: 129, cy: 272, r: 7, label: 'Hip' },
  { cx: 171, cy: 272, r: 7, label: 'Hip' },
  { cx: 127, cy: 406, r: 6.5, label: 'Knee' },
  { cx: 173, cy: 406, r: 6.5, label: 'Knee' },
  { cx: 126, cy: 518, r: 5, label: 'Ankle' },
  { cx: 174, cy: 518, r: 5, label: 'Ankle' },
]

// ---------------------------------------------------------------------------
// Training & Anatomy — core domain schema.
//
// Everything the UI renders comes from these shapes. No component hard-codes an
// exercise, a muscle, or a category; they all read the data layer below. That
// keeps the library growable to thousands of entries and keeps the door open
// for a future AI query layer ("find exercises emphasising the glutes") which
// only needs to reason over this schema.
// ---------------------------------------------------------------------------

/** Coarse anatomical region — mirrors the muscle filter chips in the library. */
export type MuscleRegion =
  | 'chest'
  | 'back'
  | 'shoulder'
  | 'arm'
  | 'trunk'
  | 'glute'
  | 'quadriceps'
  | 'hamstring'
  | 'calf'
  | 'hip'
  | 'foot-ankle'
  | 'neck'

/** Which side of the body map a muscle is visible from. */
export type AnatomyView = 'anterior' | 'posterior' | 'both'

/** Depth layer — drives the anatomy layer toggles (superficial / deep). */
export type MuscleLayer = 'superficial' | 'deep'

export interface Muscle {
  id: string
  name: string
  /** Anatomical (Latin) name, shown as a subtitle in the explorer. */
  latinName?: string
  region: MuscleRegion
  /** Display grouping, e.g. "Quadriceps" for the three vastii + rectus femoris. */
  group: string
  layer: MuscleLayer
  view: AnatomyView
  /** Plain-language anatomy description. */
  anatomy: string
  /** What the muscle does functionally, in training terms. */
  functions: string[]
  /** Discrete joint actions, e.g. "Hip extension". */
  actions: string[]
  origin?: string
  insertion?: string
  relatedMuscles: string[]
  /**
   * Stable key used to bind this muscle to a mesh in a 3D anatomy model
   * (Phase 2) and to a region on the 2D body map (Phase 1). The asset can be
   * swapped without touching any of this data as long as the mesh keeps its
   * name.
   */
  anatomyModelId: string
  /** Region ids on the SVG body map this muscle paints. */
  bodyMapRegions: string[]
  /** Notes on keeping this muscle mobile / extensible. */
  mobilityNotes?: string
}

/** Top-level exercise category. */
export type CategoryId =
  | 'strength'
  | 'power'
  | 'plyometrics'
  | 'speed'
  | 'trunk'
  | 'stability'
  | 'mobility'
  | 'return-to-play'

export interface Category {
  id: CategoryId
  name: string
  blurb: string
  subcategories: { id: string; name: string }[]
}

/** Fundamental movement pattern. */
export type MovementId =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'push'
  | 'pull'
  | 'carry'
  | 'jump'
  | 'hop'
  | 'bound'
  | 'sprint'
  | 'throw'
  | 'rotate'
  | 'brace'
  | 'isolate'

export interface Movement {
  id: MovementId
  name: string
  description: string
  category: 'locomotion' | 'lower-body' | 'upper-body' | 'trunk' | 'other'
}

export type EquipmentId =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'cable'
  | 'band'
  | 'medicine-ball'
  | 'landmine'
  | 'trap-bar'
  | 'bodyweight'
  | 'plyo-box'
  | 'sled'
  | 'bench'
  | 'other'

export type TrainingGoal =
  | 'strength'
  | 'hypertrophy'
  | 'power'
  | 'explosiveness'
  | 'speed'
  | 'stability'
  | 'mobility'
  | 'conditioning'
  | 'return-to-play'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

/**
 * Return-to-play staging. This is an ORGANISATIONAL label for sequencing
 * training complexity — it is not medical advice and carries no diagnostic
 * meaning.
 */
export type RtpStage = 'early' | 'intermediate' | 'late' | 'return-to-performance'

/** A muscle's role in an exercise. */
export type MuscleRole = 'primary' | 'secondary' | 'stabilizer'

/**
 * A muscle reference on an exercise.
 *
 * `emphasis` (0–100) is a TRAINING EMPHASIS weighting used to drive the visual
 * intensity of the anatomy highlight. It is an editorial coaching judgement,
 * NOT a measured EMG value, and the UI labels it as such everywhere.
 */
export interface MuscleRef {
  muscleId: string
  emphasis: number
}

/** Media attached to an exercise. Every slot is independent and optional. */
export interface ExerciseAssets {
  /** Static 3D model of the exercise setup (GLB/GLTF preferred). */
  modelUrl?: string
  /** Animated 3D model of the exercise (GLB/GLTF with clips). */
  animationUrl?: string
  /** MP4/WebM demonstration video. */
  videoUrl?: string
  /** Poster / grid thumbnail. */
  thumbnailUrl?: string
}

export interface Exercise {
  id: string
  name: string
  category: CategoryId
  subcategory: string
  description: string
  movementPattern: MovementId[]
  equipment: EquipmentId[]
  difficulty: Difficulty
  trainingGoals: TrainingGoal[]
  primaryMuscles: MuscleRef[]
  secondaryMuscles: MuscleRef[]
  stabilizers: MuscleRef[]
  coachingCues: string[]
  commonErrors: string[]
  /** Exercise ids (or free text if the exercise isn't in the library yet). */
  progressions: string[]
  regressions: string[]
  athleticApplications: string[]
  relatedExercises?: string[]
  rtpStage?: RtpStage
  tags: string[]
  assets: ExerciseAssets
  /** True for entries the user created via "Add Exercise". */
  custom?: boolean
  /** ISO timestamp, set on user-created exercises. */
  createdAt?: string
}

// ---------------------------------------------------------------------------
// Workouts & programs (Phase 4/5 — schema lands now so data written today
// stays readable later).
// ---------------------------------------------------------------------------

export interface WorkoutItem {
  id: string
  exerciseId: string
  sets?: number
  reps?: number
  /** Seconds. */
  duration?: number
  /** Metres. */
  distance?: number
  /** Rest between sets, seconds. */
  rest?: number
  notes?: string
}

export interface Workout {
  id: string
  name: string
  notes?: string
  items: WorkoutItem[]
  createdAt: string
  updatedAt: string
}

export interface ProgramDay {
  id: string
  name: string
  /** Either references a saved workout or inlines its own items. */
  workoutId?: string
  items: WorkoutItem[]
}

export interface ProgramWeek {
  id: string
  name: string
  days: ProgramDay[]
}

export interface ProgramPhase {
  id: string
  name: string
  focus?: string
  weeks: ProgramWeek[]
}

export interface Program {
  id: string
  name: string
  goal?: string
  notes?: string
  phases: ProgramPhase[]
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Persisted user data
// ---------------------------------------------------------------------------

export interface Favorites {
  exercises: string[]
  muscles: string[]
  workouts: string[]
  programs: string[]
}

export interface TrainingSettings {
  /** Emphasise the anatomy highlight colours more or less strongly. */
  highlightIntensity: number
  /** Show the "training emphasis" percentages on exercise pages. */
  showEmphasisValues: boolean
  /** Reduce non-essential motion. */
  reducedMotion: boolean
  /** Default anatomy view when opening an exercise. */
  defaultAnatomyView: 'anterior' | 'posterior'
  /** Units for distance-based entries. */
  units: 'metric' | 'imperial'
}

export interface TrainingData {
  version: number
  customExercises: Exercise[]
  workouts: Workout[]
  programs: Program[]
  favorites: Favorites
  recentlyViewed: string[]
  settings: TrainingSettings
}

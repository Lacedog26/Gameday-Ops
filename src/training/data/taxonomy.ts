import type {
  Category,
  CategoryId,
  Difficulty,
  EquipmentId,
  Movement,
  MovementId,
  MuscleRegion,
  RtpStage,
  TrainingGoal,
} from './types'

// ---------------------------------------------------------------------------
// Taxonomy. Categories, movements, equipment and goals live here so filter
// chips, category pages and the "Add Exercise" form all read one source.
// ---------------------------------------------------------------------------

export const CATEGORIES: Category[] = [
  {
    id: 'strength',
    name: 'Strength',
    blurb: 'Force production against external load — the base every other quality is built on.',
    subcategories: [
      { id: 'lower-body', name: 'Lower Body' },
      { id: 'upper-body', name: 'Upper Body' },
      { id: 'unilateral', name: 'Unilateral' },
      { id: 'bilateral', name: 'Bilateral' },
      { id: 'posterior-chain', name: 'Posterior Chain' },
      { id: 'anterior-chain', name: 'Anterior Chain' },
      { id: 'pull', name: 'Pull' },
      { id: 'push', name: 'Push' },
    ],
  },
  {
    id: 'power',
    name: 'Power',
    blurb: 'Force expressed fast — loaded, ballistic and Olympic-lift derivatives.',
    subcategories: [
      { id: 'olympic-variations', name: 'Olympic-Lift Variations' },
      { id: 'loaded-jumps', name: 'Loaded Jumps' },
      { id: 'throws', name: 'Throws' },
      { id: 'ballistic', name: 'Ballistic Exercises' },
      { id: 'explosive-strength', name: 'Explosive Strength' },
    ],
  },
  {
    id: 'plyometrics',
    name: 'Plyometrics',
    blurb: 'Stretch-shortening cycle work — landing, reactivity, elasticity and direction.',
    subcategories: [
      { id: 'bilateral', name: 'Bilateral' },
      { id: 'unilateral', name: 'Unilateral' },
      { id: 'horizontal', name: 'Horizontal' },
      { id: 'vertical', name: 'Vertical' },
      { id: 'lateral', name: 'Lateral' },
      { id: 'reactive', name: 'Reactive' },
      { id: 'landing', name: 'Landing' },
      { id: 'hopping', name: 'Hopping' },
      { id: 'bounding', name: 'Bounding' },
    ],
  },
  {
    id: 'speed',
    name: 'Speed',
    blurb: 'Sprint mechanics, acceleration, top-end velocity and change of direction.',
    subcategories: [
      { id: 'acceleration', name: 'Acceleration' },
      { id: 'max-velocity', name: 'Max Velocity' },
      { id: 'mechanics', name: 'Mechanics' },
      { id: 'resisted-sprinting', name: 'Resisted Sprinting' },
      { id: 'change-of-direction', name: 'Change of Direction' },
    ],
  },
  {
    id: 'trunk',
    name: 'Trunk',
    blurb: 'Force transfer through the midsection — mostly about resisting motion, not making it.',
    subcategories: [
      { id: 'anti-extension', name: 'Anti-Extension' },
      { id: 'anti-rotation', name: 'Anti-Rotation' },
      { id: 'anti-lateral-flexion', name: 'Anti-Lateral Flexion' },
      { id: 'rotation', name: 'Rotation' },
      { id: 'flexion', name: 'Flexion' },
      { id: 'extension', name: 'Extension' },
      { id: 'bracing', name: 'Bracing' },
    ],
  },
  {
    id: 'stability',
    name: 'Stability',
    blurb: 'Joint control under load and at speed — the quality that keeps output on rails.',
    subcategories: [
      { id: 'shoulder', name: 'Shoulder' },
      { id: 'hip', name: 'Hip' },
      { id: 'knee', name: 'Knee' },
      { id: 'ankle', name: 'Ankle' },
      { id: 'trunk', name: 'Trunk' },
      { id: 'scapular', name: 'Scapular' },
    ],
  },
  {
    id: 'mobility',
    name: 'Mobility',
    blurb: 'Usable range of motion — actively owned, not passively stretched into.',
    subcategories: [
      { id: 'hip', name: 'Hip' },
      { id: 'ankle', name: 'Ankle' },
      { id: 'thoracic-spine', name: 'Thoracic Spine' },
      { id: 'shoulder', name: 'Shoulder' },
      { id: 'hamstring', name: 'Hamstring' },
      { id: 'adductor', name: 'Adductor' },
    ],
  },
  {
    id: 'return-to-play',
    name: 'Return to Play',
    blurb:
      'An organisational staging system for sequencing training complexity. Not medical guidance and not a diagnostic tool.',
    subcategories: [
      { id: 'early', name: 'Early' },
      { id: 'intermediate', name: 'Intermediate' },
      { id: 'late', name: 'Late' },
      { id: 'return-to-performance', name: 'Return to Performance' },
    ],
  },
]

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>

export const MOVEMENTS: Movement[] = [
  { id: 'squat', name: 'Squat', description: 'Knee-dominant bend with an upright-ish torso.', category: 'lower-body' },
  { id: 'hinge', name: 'Hinge', description: 'Hip-dominant bend with a long spine and loaded posterior chain.', category: 'lower-body' },
  { id: 'lunge', name: 'Lunge', description: 'Split-stance loading with offset feet.', category: 'lower-body' },
  { id: 'push', name: 'Push', description: 'Driving load away from the torso, horizontally or vertically.', category: 'upper-body' },
  { id: 'pull', name: 'Pull', description: 'Drawing load toward the torso, horizontally or vertically.', category: 'upper-body' },
  { id: 'carry', name: 'Carry', description: 'Holding load while walking — trunk and grip under time.', category: 'trunk' },
  { id: 'jump', name: 'Jump', description: 'Two-foot take-off and projection of the body.', category: 'locomotion' },
  { id: 'hop', name: 'Hop', description: 'Single-leg take-off and landing on the same leg.', category: 'locomotion' },
  { id: 'bound', name: 'Bound', description: 'Single-leg take-off, landing on the opposite leg.', category: 'locomotion' },
  { id: 'sprint', name: 'Sprint', description: 'Maximal cyclic running mechanics.', category: 'locomotion' },
  { id: 'throw', name: 'Throw', description: 'Ballistic projection of an implement.', category: 'upper-body' },
  { id: 'rotate', name: 'Rotate', description: 'Producing or resisting rotation through the trunk.', category: 'trunk' },
  { id: 'brace', name: 'Brace', description: 'Holding a position against an external force.', category: 'trunk' },
  { id: 'isolate', name: 'Isolate', description: 'Targeting a single joint or muscle directly.', category: 'other' },
]

export const MOVEMENT_BY_ID: Record<MovementId, Movement> = Object.fromEntries(
  MOVEMENTS.map((m) => [m.id, m]),
) as Record<MovementId, Movement>

export const EQUIPMENT: { id: EquipmentId; name: string }[] = [
  { id: 'barbell', name: 'Barbell' },
  { id: 'dumbbell', name: 'Dumbbell' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'cable', name: 'Cable' },
  { id: 'band', name: 'Resistance Band' },
  { id: 'medicine-ball', name: 'Medicine Ball' },
  { id: 'landmine', name: 'Landmine' },
  { id: 'trap-bar', name: 'Trap Bar' },
  { id: 'bodyweight', name: 'Bodyweight' },
  { id: 'plyo-box', name: 'Plyometric Box' },
  { id: 'sled', name: 'Sled' },
  { id: 'bench', name: 'Bench' },
  { id: 'other', name: 'Other' },
]

export const EQUIPMENT_NAME: Record<EquipmentId, string> = Object.fromEntries(
  EQUIPMENT.map((e) => [e.id, e.name]),
) as Record<EquipmentId, string>

export const TRAINING_GOALS: { id: TrainingGoal; name: string }[] = [
  { id: 'strength', name: 'Strength' },
  { id: 'hypertrophy', name: 'Hypertrophy' },
  { id: 'power', name: 'Power' },
  { id: 'explosiveness', name: 'Explosiveness' },
  { id: 'speed', name: 'Speed' },
  { id: 'stability', name: 'Stability' },
  { id: 'mobility', name: 'Mobility' },
  { id: 'conditioning', name: 'Conditioning' },
  { id: 'return-to-play', name: 'Return to Play' },
]

export const GOAL_NAME: Record<TrainingGoal, string> = Object.fromEntries(
  TRAINING_GOALS.map((g) => [g.id, g.name]),
) as Record<TrainingGoal, string>

export const REGIONS: { id: MuscleRegion; name: string }[] = [
  { id: 'chest', name: 'Chest' },
  { id: 'back', name: 'Back' },
  { id: 'shoulder', name: 'Shoulder' },
  { id: 'arm', name: 'Arm' },
  { id: 'trunk', name: 'Trunk' },
  { id: 'glute', name: 'Glute' },
  { id: 'quadriceps', name: 'Quadriceps' },
  { id: 'hamstring', name: 'Hamstring' },
  { id: 'calf', name: 'Calf' },
  { id: 'hip', name: 'Hip' },
  { id: 'foot-ankle', name: 'Foot / Ankle' },
  { id: 'neck', name: 'Neck' },
]

export const REGION_NAME: Record<MuscleRegion, string> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r.name]),
) as Record<MuscleRegion, string>

export const DIFFICULTIES: { id: Difficulty; name: string }[] = [
  { id: 'beginner', name: 'Beginner' },
  { id: 'intermediate', name: 'Intermediate' },
  { id: 'advanced', name: 'Advanced' },
]

export const RTP_STAGES: { id: RtpStage; name: string }[] = [
  { id: 'early', name: 'Early' },
  { id: 'intermediate', name: 'Intermediate' },
  { id: 'late', name: 'Late' },
  { id: 'return-to-performance', name: 'Return to Performance' },
]

export const RTP_STAGE_NAME: Record<RtpStage, string> = Object.fromEntries(
  RTP_STAGES.map((s) => [s.id, s.name]),
) as Record<RtpStage, string>

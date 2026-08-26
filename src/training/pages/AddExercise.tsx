import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CategoryId, Difficulty, EquipmentId, Exercise, MovementId, MuscleRef, TrainingGoal } from '../data/types'
import { CATEGORIES, DIFFICULTIES, EQUIPMENT, MOVEMENTS, TRAINING_GOALS } from '../data/taxonomy'
import { MUSCLES, MUSCLE_BY_ID } from '../data/muscles'
import { newId, useTraining } from '../state/store'
import { searchMuscles } from '../lib/search'
import { EMPHASIS_DISCLAIMER } from '../config/visual'
import { Button, Card, Chip, Eyebrow, Field, PageHeader, PlaceholderNote, SearchInput, SectionTitle, Select, TextArea, TextInput, cx } from '../components/ui'

// ---------------------------------------------------------------------------
// Personal exercise creation. A saved exercise is merged into the same list as
// the built-in library, so it is immediately searchable, filterable, linkable
// and paints the anatomy exactly like a shipped entry.
// ---------------------------------------------------------------------------

type Role = 'primary' | 'secondary' | 'stabilizer'

const ROLE_LABEL: Record<Role, string> = { primary: 'Primary', secondary: 'Secondary', stabilizer: 'Stabilizers' }
const DEFAULT_EMPHASIS: Record<Role, number> = { primary: 85, secondary: 60, stabilizer: 45 }

function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'exercise'
}

export default function AddExercise() {
  const navigate = useNavigate()
  const { addCustomExercise, exercises } = useTraining()

  const [name, setName] = useState('')
  const [category, setCategory] = useState<CategoryId>('strength')
  const [subcategory, setSubcategory] = useState<string>(CATEGORIES[0].subcategories[0].id)
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate')
  const [movements, setMovements] = useState<MovementId[]>([])
  const [equipment, setEquipment] = useState<EquipmentId[]>([])
  const [goals, setGoals] = useState<TrainingGoal[]>([])
  const [muscles, setMuscles] = useState<Record<Role, MuscleRef[]>>({ primary: [], secondary: [], stabilizer: [] })
  const [cues, setCues] = useState('')
  const [errors, setErrors] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [modelUrl, setModelUrl] = useState('')
  const [muscleQuery, setMuscleQuery] = useState('')
  const [activeRole, setActiveRole] = useState<Role>('primary')
  const [problem, setProblem] = useState<string | null>(null)

  const subcategories = useMemo(() => CATEGORIES.find((c) => c.id === category)?.subcategories ?? [], [category])
  const muscleMatches = useMemo(() => (muscleQuery ? searchMuscles(MUSCLES, muscleQuery).slice(0, 8) : []), [muscleQuery])

  function addMuscle(role: Role, muscleId: string) {
    setMuscles((prev) => {
      if (prev[role].some((r) => r.muscleId === muscleId)) return prev
      return { ...prev, [role]: [...prev[role], { muscleId, emphasis: DEFAULT_EMPHASIS[role] }] }
    })
    setMuscleQuery('')
  }

  function removeMuscle(role: Role, muscleId: string) {
    setMuscles((prev) => ({ ...prev, [role]: prev[role].filter((r) => r.muscleId !== muscleId) }))
  }

  function setEmphasis(role: Role, muscleId: string, emphasis: number) {
    setMuscles((prev) => ({ ...prev, [role]: prev[role].map((r) => (r.muscleId === muscleId ? { ...r, emphasis } : r)) }))
  }

  function save() {
    if (!name.trim()) {
      setProblem('Give the exercise a name.')
      return
    }
    if (muscles.primary.length === 0) {
      setProblem('Add at least one primary muscle — without it the anatomy has nothing to highlight.')
      return
    }

    // Keep ids unique against both built-ins and previously created entries.
    let id = slugify(name)
    if (exercises.some((e) => e.id === id)) id = `${id}-${newId('c').split('-').pop()}`

    const exercise: Exercise = {
      id,
      name: name.trim(),
      category,
      subcategory,
      description: description.trim() || 'No description yet.',
      movementPattern: movements,
      equipment: equipment.length > 0 ? equipment : ['bodyweight'],
      difficulty,
      trainingGoals: goals,
      primaryMuscles: muscles.primary,
      secondaryMuscles: muscles.secondary,
      stabilizers: muscles.stabilizer,
      coachingCues: toLines(cues),
      commonErrors: toLines(errors),
      progressions: [],
      regressions: [],
      athleticApplications: toLines(notes),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      assets: {
        videoUrl: videoUrl.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        modelUrl: modelUrl.trim() || undefined,
      },
      custom: true,
      createdAt: new Date().toISOString(),
    }

    addCustomExercise(exercise)
    navigate(`/train/exercise/${exercise.id}`)
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Add Exercise"
        title="Add an exercise"
        subtitle="Saved exercises join the same library as the built-in entries — searchable, filterable and wired into the anatomy immediately."
      />

      <div className="space-y-5">
        <Card className="space-y-4 p-4">
          <SectionTitle>Basics</SectionTitle>
          <Field label="Exercise name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landmine Lateral Lunge" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select
                value={category}
                onChange={(e) => {
                  const next = e.target.value as CategoryId
                  setCategory(next)
                  setSubcategory(CATEGORIES.find((c) => c.id === next)?.subcategories[0].id ?? '')
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subcategory">
              <Select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description">
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the exercise is and what it is for." />
          </Field>

          <Field label="Difficulty">
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              {DIFFICULTIES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </Card>

        <Card className="space-y-4 p-4">
          <SectionTitle>Classification</SectionTitle>
          <div>
            <Eyebrow className="mb-2">Movement pattern</Eyebrow>
            <div className="flex flex-wrap gap-1.5">
              {MOVEMENTS.map((mv) => (
                <Chip
                  key={mv.id}
                  active={movements.includes(mv.id)}
                  onClick={() => setMovements((prev) => (prev.includes(mv.id) ? prev.filter((v) => v !== mv.id) : [...prev, mv.id]))}
                >
                  {mv.name}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <Eyebrow className="mb-2">Equipment</Eyebrow>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT.map((eq) => (
                <Chip
                  key={eq.id}
                  active={equipment.includes(eq.id)}
                  onClick={() => setEquipment((prev) => (prev.includes(eq.id) ? prev.filter((v) => v !== eq.id) : [...prev, eq.id]))}
                >
                  {eq.name}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <Eyebrow className="mb-2">Training goal</Eyebrow>
            <div className="flex flex-wrap gap-1.5">
              {TRAINING_GOALS.map((g) => (
                <Chip
                  key={g.id}
                  active={goals.includes(g.id)}
                  onClick={() => setGoals((prev) => (prev.includes(g.id) ? prev.filter((v) => v !== g.id) : [...prev, g.id]))}
                >
                  {g.name}
                </Chip>
              ))}
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <SectionTitle hint={EMPHASIS_DISCLAIMER}>Muscles</SectionTitle>

          <div className="flex gap-1.5">
            {(['primary', 'secondary', 'stabilizer'] as Role[]).map((role) => (
              <Chip key={role} active={activeRole === role} onClick={() => setActiveRole(role)} count={muscles[role].length}>
                {ROLE_LABEL[role]}
              </Chip>
            ))}
          </div>

          <div>
            <SearchInput
              value={muscleQuery}
              onChange={setMuscleQuery}
              placeholder={`Search a muscle to add as ${ROLE_LABEL[activeRole].toLowerCase()}…`}
              ariaLabel="Search muscles to add"
            />
            {muscleMatches.length > 0 ? (
              <div className="mt-2 space-y-1">
                {muscleMatches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => addMuscle(activeRole, m.id)}
                    className="flex w-full items-center justify-between rounded-[3px] border border-tr-line px-2.5 py-1.5 text-left hover:border-tr-accent"
                  >
                    <span className="text-[13px] text-tr-text">{m.name}</span>
                    <span className="tr-mono text-[10px] uppercase text-tr-dim">{m.group}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {(['primary', 'secondary', 'stabilizer'] as Role[]).map((role) =>
            muscles[role].length > 0 ? (
              <div key={role}>
                <Eyebrow className="mb-2">{ROLE_LABEL[role]}</Eyebrow>
                <div className="space-y-1.5">
                  {muscles[role].map((ref) => (
                    <div key={ref.muscleId} className="flex items-center gap-3 rounded-[3px] border border-tr-line px-2.5 py-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-tr-text">{MUSCLE_BY_ID[ref.muscleId]?.name ?? ref.muscleId}</span>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={ref.emphasis}
                        aria-label={`Training emphasis for ${MUSCLE_BY_ID[ref.muscleId]?.name}`}
                        onChange={(e) => setEmphasis(role, ref.muscleId, Number(e.target.value))}
                        className="w-28"
                      />
                      <span className="tr-mono w-7 text-right text-[11px] text-tr-dim">{ref.emphasis}</span>
                      <button type="button" onClick={() => removeMuscle(role, ref.muscleId)} aria-label="Remove muscle" className="text-tr-dim hover:text-tr-primary">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </Card>

        <Card className="space-y-4 p-4">
          <SectionTitle hint="One item per line.">Coaching</SectionTitle>
          <Field label="Coaching cues">
            <TextArea value={cues} onChange={(e) => setCues(e.target.value)} placeholder={'Brace before you move\nDrive through the whole foot'} />
          </Field>
          <Field label="Common errors">
            <TextArea value={errors} onChange={(e) => setErrors(e.target.value)} placeholder={'Knee collapsing inward\nLosing the brace at the bottom'} />
          </Field>
          <Field label="Athletic application / notes">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Field label="Tags" hint="Comma separated. Tags are searchable.">
            <TextInput value={tags} onChange={(e) => setTags(e.target.value)} placeholder="unilateral, frontal plane, groin" />
          </Field>
        </Card>

        <Card className="space-y-4 p-4">
          <SectionTitle>Media</SectionTitle>
          <PlaceholderNote>
            Files are referenced by path, not uploaded. Put media under <span className="tr-mono">public/assets/</span> and point at it with a
            relative path such as <span className="tr-mono">./assets/videos/my-clip.mp4</span>.
          </PlaceholderNote>
          <Field label="Video URL" hint="MP4 or WebM.">
            <TextInput value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="./assets/videos/my-exercise.mp4" />
          </Field>
          <Field label="Thumbnail URL">
            <TextInput value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="./assets/thumbnails/my-exercise.jpg" />
          </Field>
          <Field label="3D model URL" hint="GLB or GLTF. Stored now, rendered when the 3D player lands in Phase 3.">
            <TextInput value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} placeholder="./assets/exercises/my-exercise.glb" />
          </Field>
        </Card>

        {problem ? (
          <div className={cx('rounded-[3px] border border-[#5A2530] bg-[#2A1418] px-3 py-2.5 text-[13px] text-[#FF9C90]')} role="alert">
            {problem}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pb-4">
          <Button variant="primary" onClick={save}>
            Save exercise
          </Button>
          <Button variant="ghost" onClick={() => navigate('/train/library')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Exercise, Favorites, Program, TrainingData, TrainingSettings, Workout, WorkoutItem } from '../data/types'
import { BUILT_IN_EXERCISES } from '../data/exercises'
import { emptyData, loadTrainingData, normalizeData, saveTrainingData, storageAvailable, TRAINING_DATA_VERSION } from './persistence'

// ---------------------------------------------------------------------------
// Training store.
//
// One provider owns all user data. Built-in exercises are merged with the
// user's own on every read, so a custom exercise is immediately searchable,
// filterable and linkable exactly like a shipped one.
// ---------------------------------------------------------------------------

const RECENT_LIMIT = 10

export type FavoriteKind = keyof Favorites

interface TrainingStore {
  data: TrainingData
  /** Built-in library merged with user-created exercises. */
  exercises: Exercise[]
  exerciseById: (id: string) => Exercise | undefined
  storageOk: boolean

  isFavorite: (kind: FavoriteKind, id: string) => boolean
  toggleFavorite: (kind: FavoriteKind, id: string) => void

  addRecentlyViewed: (exerciseId: string) => void
  clearRecentlyViewed: () => void

  addCustomExercise: (exercise: Exercise) => void
  updateCustomExercise: (exercise: Exercise) => void
  deleteCustomExercise: (id: string) => void

  createWorkout: (name: string) => Workout
  updateWorkout: (workout: Workout) => void
  deleteWorkout: (id: string) => void
  addExerciseToWorkout: (workoutId: string, exerciseId: string) => void
  updateWorkoutItem: (workoutId: string, itemId: string, patch: Partial<WorkoutItem>) => void
  removeWorkoutItem: (workoutId: string, itemId: string) => void
  moveWorkoutItem: (workoutId: string, itemId: string, direction: -1 | 1) => void

  createProgram: (name: string) => Program
  updateProgram: (program: Program) => void
  deleteProgram: (id: string) => void

  updateSettings: (patch: Partial<TrainingSettings>) => void

  exportData: () => string
  importData: (json: string, mode: 'merge' | 'replace') => { ok: boolean; message: string }
  resetAll: () => void
}

const StoreContext = createContext<TrainingStore | null>(null)

export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${rand}`
}

function nowIso() {
  return new Date().toISOString()
}

export function TrainingStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TrainingData>(() => loadTrainingData())
  const [storageOk] = useState(() => storageAvailable())
  // Skip the very first save so mounting never rewrites storage unnecessarily.
  const hydrated = useRef(false)

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    saveTrainingData(data)
  }, [data])

  // Keep multiple tabs of the app in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key && e.key.includes('training') && e.newValue) {
        try {
          setData(normalizeData(JSON.parse(e.newValue)))
        } catch {
          /* ignore malformed cross-tab writes */
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const exercises = useMemo(() => {
    // Custom entries override a built-in with the same id, which is what makes
    // "edit a shipped exercise" possible later without mutating source data.
    const map = new Map<string, Exercise>()
    for (const e of BUILT_IN_EXERCISES) map.set(e.id, e)
    for (const e of data.customExercises) map.set(e.id, { ...e, custom: true })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [data.customExercises])

  const exerciseIndex = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const exerciseById = useCallback((id: string) => exerciseIndex.get(id), [exerciseIndex])

  const isFavorite = useCallback((kind: FavoriteKind, id: string) => data.favorites[kind].includes(id), [data.favorites])

  const toggleFavorite = useCallback((kind: FavoriteKind, id: string) => {
    setData((prev) => {
      const list = prev.favorites[kind]
      const next = list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
      return { ...prev, favorites: { ...prev.favorites, [kind]: next } }
    })
  }, [])

  const addRecentlyViewed = useCallback((exerciseId: string) => {
    setData((prev) => {
      if (prev.recentlyViewed[0] === exerciseId) return prev
      const next = [exerciseId, ...prev.recentlyViewed.filter((id) => id !== exerciseId)].slice(0, RECENT_LIMIT)
      return { ...prev, recentlyViewed: next }
    })
  }, [])

  const clearRecentlyViewed = useCallback(() => setData((prev) => ({ ...prev, recentlyViewed: [] })), [])

  const addCustomExercise = useCallback((exercise: Exercise) => {
    setData((prev) => ({
      ...prev,
      customExercises: [...prev.customExercises, { ...exercise, custom: true, createdAt: exercise.createdAt ?? nowIso() }],
    }))
  }, [])

  const updateCustomExercise = useCallback((exercise: Exercise) => {
    setData((prev) => ({
      ...prev,
      customExercises: prev.customExercises.map((e) => (e.id === exercise.id ? { ...exercise, custom: true } : e)),
    }))
  }, [])

  const deleteCustomExercise = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      customExercises: prev.customExercises.filter((e) => e.id !== id),
      favorites: { ...prev.favorites, exercises: prev.favorites.exercises.filter((f) => f !== id) },
      recentlyViewed: prev.recentlyViewed.filter((r) => r !== id),
      workouts: prev.workouts.map((w) => ({ ...w, items: w.items.filter((i) => i.exerciseId !== id) })),
    }))
  }, [])

  const createWorkout = useCallback((name: string) => {
    const workout: Workout = { id: newId('wk'), name, items: [], createdAt: nowIso(), updatedAt: nowIso() }
    setData((prev) => ({ ...prev, workouts: [workout, ...prev.workouts] }))
    return workout
  }, [])

  const updateWorkout = useCallback((workout: Workout) => {
    setData((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w) => (w.id === workout.id ? { ...workout, updatedAt: nowIso() } : w)),
    }))
  }, [])

  const deleteWorkout = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      workouts: prev.workouts.filter((w) => w.id !== id),
      favorites: { ...prev.favorites, workouts: prev.favorites.workouts.filter((f) => f !== id) },
    }))
  }, [])

  const mutateWorkout = useCallback((workoutId: string, fn: (w: Workout) => Workout) => {
    setData((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w) => (w.id === workoutId ? { ...fn(w), updatedAt: nowIso() } : w)),
    }))
  }, [])

  const addExerciseToWorkout = useCallback(
    (workoutId: string, exerciseId: string) => {
      mutateWorkout(workoutId, (w) => ({
        ...w,
        items: [...w.items, { id: newId('item'), exerciseId, sets: 3, reps: 5, rest: 90 }],
      }))
    },
    [mutateWorkout],
  )

  const updateWorkoutItem = useCallback(
    (workoutId: string, itemId: string, patch: Partial<WorkoutItem>) => {
      mutateWorkout(workoutId, (w) => ({ ...w, items: w.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }))
    },
    [mutateWorkout],
  )

  const removeWorkoutItem = useCallback(
    (workoutId: string, itemId: string) => {
      mutateWorkout(workoutId, (w) => ({ ...w, items: w.items.filter((i) => i.id !== itemId) }))
    },
    [mutateWorkout],
  )

  const moveWorkoutItem = useCallback(
    (workoutId: string, itemId: string, direction: -1 | 1) => {
      mutateWorkout(workoutId, (w) => {
        const index = w.items.findIndex((i) => i.id === itemId)
        const target = index + direction
        if (index < 0 || target < 0 || target >= w.items.length) return w
        const items = [...w.items]
        const [moved] = items.splice(index, 1)
        items.splice(target, 0, moved)
        return { ...w, items }
      })
    },
    [mutateWorkout],
  )

  const createProgram = useCallback((name: string) => {
    const program: Program = {
      id: newId('pg'),
      name,
      phases: [
        {
          id: newId('ph'),
          name: 'Phase 1',
          weeks: [{ id: newId('wkk'), name: 'Week 1', days: [{ id: newId('day'), name: 'Day 1', items: [] }] }],
        },
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    setData((prev) => ({ ...prev, programs: [program, ...prev.programs] }))
    return program
  }, [])

  const updateProgram = useCallback((program: Program) => {
    setData((prev) => ({ ...prev, programs: prev.programs.map((p) => (p.id === program.id ? { ...program, updatedAt: nowIso() } : p)) }))
  }, [])

  const deleteProgram = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      programs: prev.programs.filter((p) => p.id !== id),
      favorites: { ...prev.favorites, programs: prev.favorites.programs.filter((f) => f !== id) },
    }))
  }, [])

  const updateSettings = useCallback((patch: Partial<TrainingSettings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])

  const exportData = useCallback(() => JSON.stringify({ ...data, version: TRAINING_DATA_VERSION, exportedAt: nowIso() }, null, 2), [data])

  const importData = useCallback((json: string, mode: 'merge' | 'replace') => {
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      return { ok: false, message: 'That file is not valid JSON.' }
    }
    const incoming = normalizeData(parsed)
    if (mode === 'replace') {
      setData(incoming)
      return { ok: true, message: 'Data replaced from the imported file.' }
    }
    setData((prev) => {
      const byId = new Map(prev.customExercises.map((e) => [e.id, e]))
      for (const e of incoming.customExercises) byId.set(e.id, e)
      const workouts = new Map(prev.workouts.map((w) => [w.id, w]))
      for (const w of incoming.workouts) workouts.set(w.id, w)
      const programs = new Map(prev.programs.map((p) => [p.id, p]))
      for (const p of incoming.programs) programs.set(p.id, p)
      const union = (a: string[], b: string[]) => [...new Set([...a, ...b])]
      return {
        version: TRAINING_DATA_VERSION,
        customExercises: [...byId.values()],
        workouts: [...workouts.values()],
        programs: [...programs.values()],
        favorites: {
          exercises: union(prev.favorites.exercises, incoming.favorites.exercises),
          muscles: union(prev.favorites.muscles, incoming.favorites.muscles),
          workouts: union(prev.favorites.workouts, incoming.favorites.workouts),
          programs: union(prev.favorites.programs, incoming.favorites.programs),
        },
        recentlyViewed: union(prev.recentlyViewed, incoming.recentlyViewed).slice(0, RECENT_LIMIT),
        settings: { ...prev.settings, ...incoming.settings },
      }
    })
    return { ok: true, message: 'Imported and merged into your existing data.' }
  }, [])

  const resetAll = useCallback(() => setData(emptyData()), [])

  const value = useMemo<TrainingStore>(
    () => ({
      data,
      exercises,
      exerciseById,
      storageOk,
      isFavorite,
      toggleFavorite,
      addRecentlyViewed,
      clearRecentlyViewed,
      addCustomExercise,
      updateCustomExercise,
      deleteCustomExercise,
      createWorkout,
      updateWorkout,
      deleteWorkout,
      addExerciseToWorkout,
      updateWorkoutItem,
      removeWorkoutItem,
      moveWorkoutItem,
      createProgram,
      updateProgram,
      deleteProgram,
      updateSettings,
      exportData,
      importData,
      resetAll,
    }),
    [
      data,
      exercises,
      exerciseById,
      storageOk,
      isFavorite,
      toggleFavorite,
      addRecentlyViewed,
      clearRecentlyViewed,
      addCustomExercise,
      updateCustomExercise,
      deleteCustomExercise,
      createWorkout,
      updateWorkout,
      deleteWorkout,
      addExerciseToWorkout,
      updateWorkoutItem,
      removeWorkoutItem,
      moveWorkoutItem,
      createProgram,
      updateProgram,
      deleteProgram,
      updateSettings,
      exportData,
      importData,
      resetAll,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useTraining(): TrainingStore {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useTraining must be used inside <TrainingStoreProvider>')
  return ctx
}

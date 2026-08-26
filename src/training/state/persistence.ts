import type { Exercise, TrainingData, TrainingSettings } from '../data/types'

// ---------------------------------------------------------------------------
// Local-first persistence.
//
// Everything the user creates lives in localStorage under one key, entirely on
// this device. No accounts, no network, no sync. The whole blob is also the
// export format, so an export is a byte-for-byte snapshot of what is stored.
// ---------------------------------------------------------------------------

export const TRAINING_STORAGE_KEY = 'gameday-ops:training:v1'
export const TRAINING_DATA_VERSION = 1

export const DEFAULT_SETTINGS: TrainingSettings = {
  highlightIntensity: 1,
  showEmphasisValues: true,
  reducedMotion: false,
  defaultAnatomyView: 'anterior',
  units: 'imperial',
}

export function emptyData(): TrainingData {
  return {
    version: TRAINING_DATA_VERSION,
    customExercises: [],
    workouts: [],
    programs: [],
    favorites: { exercises: [], muscles: [], workouts: [], programs: [] },
    recentlyViewed: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])
const asStringArray = (value: unknown): string[] => asArray<unknown>(value).filter((v): v is string => typeof v === 'string')

/**
 * Merge unknown JSON onto the default shape.
 *
 * Used for both loading from storage and importing a file, so a partial or
 * older export never leaves the app in a broken state.
 */
export function normalizeData(input: unknown): TrainingData {
  const base = emptyData()
  if (!input || typeof input !== 'object') return base
  const raw = input as Record<string, unknown>
  const favorites = (raw.favorites ?? {}) as Record<string, unknown>
  const settings = (raw.settings ?? {}) as Record<string, unknown>

  return {
    version: typeof raw.version === 'number' ? raw.version : TRAINING_DATA_VERSION,
    customExercises: asArray<Exercise>(raw.customExercises).filter((e) => e && typeof e.id === 'string' && typeof e.name === 'string'),
    workouts: asArray(raw.workouts),
    programs: asArray(raw.programs),
    favorites: {
      exercises: asStringArray(favorites.exercises),
      muscles: asStringArray(favorites.muscles),
      workouts: asStringArray(favorites.workouts),
      programs: asStringArray(favorites.programs),
    },
    recentlyViewed: asStringArray(raw.recentlyViewed).slice(0, 50),
    settings: {
      highlightIntensity: numberOr(settings.highlightIntensity, DEFAULT_SETTINGS.highlightIntensity, 0.4, 1.4),
      showEmphasisValues: typeof settings.showEmphasisValues === 'boolean' ? settings.showEmphasisValues : DEFAULT_SETTINGS.showEmphasisValues,
      reducedMotion: typeof settings.reducedMotion === 'boolean' ? settings.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
      defaultAnatomyView: settings.defaultAnatomyView === 'posterior' ? 'posterior' : 'anterior',
      units: settings.units === 'metric' ? 'metric' : 'imperial',
    },
  }
}

function numberOr(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(min, Math.min(max, value))
}

export function loadTrainingData(): TrainingData {
  try {
    const raw = localStorage.getItem(TRAINING_STORAGE_KEY)
    if (!raw) return emptyData()
    return normalizeData(JSON.parse(raw))
  } catch (err) {
    console.warn('[training] could not read saved data, starting fresh', err)
    return emptyData()
  }
}

export function saveTrainingData(data: TrainingData): boolean {
  try {
    localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (err) {
    // Quota exceeded, or storage disabled (private mode / blocked cookies).
    console.warn('[training] could not save data', err)
    return false
  }
}

/** True when localStorage is usable at all — surfaced in Settings. */
export function storageAvailable(): boolean {
  try {
    const probe = '__training_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

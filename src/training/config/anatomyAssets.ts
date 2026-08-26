// ---------------------------------------------------------------------------
// Anatomy asset registry.
//
// The anatomy model is NOT hard-coded into any component. The viewer asks this
// registry which model to load; muscles bind to it by `anatomyModelId` (the
// mesh name inside the model), so a better model can be dropped in later by
// editing this one file — provided its meshes carry the same names.
//
// To install a model:
//   1. Put the file in  public/assets/anatomy/
//   2. Add an entry below with its url and the mesh naming convention it uses.
//   3. Set ACTIVE_ANATOMY_MODEL to that entry's id.
//
// Until a real model is registered, the app renders the built-in 2D body map
// and says so plainly rather than pretending a 3D model is present.
// ---------------------------------------------------------------------------

export type AnatomyModelFormat = 'glb' | 'gltf' | 'fbx'

export interface AnatomyModelSource {
  id: string
  name: string
  format: AnatomyModelFormat
  /** Path relative to the site root, e.g. "./assets/anatomy/male-muscular.glb". */
  url: string
  /** Rough download size, shown in the loading state. */
  approxSizeMb?: number
  /** Attribution / licence text. Required for anything not authored here. */
  license: string
  /**
   * How mesh names in the file map to `Muscle.anatomyModelId`.
   * 'exact'  — mesh names already match.
   * 'prefix' — mesh names are `${prefix}${anatomyModelId}`.
   */
  meshNaming: { strategy: 'exact' | 'prefix'; prefix?: string }
  /** Layers the model actually contains, so the UI only offers real toggles. */
  layers: { skin: boolean; superficial: boolean; deep: boolean; bones: boolean; joints: boolean }
}

/**
 * Registered anatomy models. Empty by design — no third-party anatomy model
 * ships with this repository. Add your own licensed or self-authored asset.
 */
export const ANATOMY_MODELS: AnatomyModelSource[] = []

/** Id of the model the viewer should use, or null to use the 2D body map. */
export const ACTIVE_ANATOMY_MODEL: string | null = null

export function activeAnatomyModel(): AnatomyModelSource | null {
  if (!ACTIVE_ANATOMY_MODEL) return null
  return ANATOMY_MODELS.find((m) => m.id === ACTIVE_ANATOMY_MODEL) ?? null
}

/** Resolve a muscle's mesh name inside a given model. */
export function meshNameFor(model: AnatomyModelSource, anatomyModelId: string): string {
  return model.meshNaming.strategy === 'prefix' ? `${model.meshNaming.prefix ?? ''}${anatomyModelId}` : anatomyModelId
}

/** Where new anatomy assets belong, surfaced in the UI so it is never a guess. */
export const ANATOMY_ASSET_DIR = 'public/assets/anatomy/'

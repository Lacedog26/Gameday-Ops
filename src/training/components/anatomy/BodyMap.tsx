import { useMemo } from 'react'
import type { MuscleRole } from '../../data/types'
import { MUSCLES } from '../../data/muscles'
import { ANATOMY_BASE, paintFor } from '../../config/visual'
import { BODY_SILHOUETTE, BODY_VIEWBOX, JOINT_MARKERS, MIRROR_TRANSFORM, regionsForView, SKELETON_PATHS } from './bodyMapPaths'

// ---------------------------------------------------------------------------
// The Phase 1 anatomy target: an interactive 2D body map.
//
// It consumes exactly the same inputs the Phase 2 three.js viewer will — a
// muscle-id -> {role, emphasis} map, a layer set, a selection and an isolate
// list — so swapping the renderer later is a component substitution, not a
// rewrite of the pages that use it.
// ---------------------------------------------------------------------------

export type AnatomyLayers = {
  skin: boolean
  superficial: boolean
  deep: boolean
  bones: boolean
  joints: boolean
}

export const DEFAULT_LAYERS: AnatomyLayers = { skin: true, superficial: true, deep: true, bones: false, joints: false }

export interface Highlight {
  role: MuscleRole
  emphasis: number
}

export interface BodyMapProps {
  view: 'anterior' | 'posterior'
  highlights?: Map<string, Highlight>
  layers?: AnatomyLayers
  /** Muscle id currently selected in the explorer. */
  selectedMuscleId?: string | null
  /** When non-empty, only these muscles are painted (isolate mode). */
  isolatedMuscleIds?: string[]
  /** Muscles the user has explicitly hidden. */
  hiddenMuscleIds?: string[]
  /** Dim every region that is not involved in the current highlight set. */
  dimUninvolved?: boolean
  /** Global intensity multiplier from settings. */
  intensity?: number
  onRegionClick?: (regionId: string, muscleIds: string[]) => void
  className?: string
  /** Zoom factor applied to the SVG viewport (1 = fit). */
  zoom?: number
}

/** region id -> muscles that paint it, precomputed once. */
const REGION_MUSCLES: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>()
  for (const muscle of MUSCLES) {
    for (const region of muscle.bodyMapRegions) {
      const list = map.get(region) ?? []
      list.push(muscle.id)
      map.set(region, list)
    }
  }
  return map
})()

export function musclesInRegion(regionId: string): string[] {
  return REGION_MUSCLES.get(regionId) ?? []
}

const ROLE_RANK: Record<MuscleRole, number> = { primary: 0, secondary: 1, stabilizer: 2 }

export default function BodyMap({
  view,
  highlights,
  layers = DEFAULT_LAYERS,
  selectedMuscleId = null,
  isolatedMuscleIds = [],
  hiddenMuscleIds = [],
  dimUninvolved = true,
  intensity = 1,
  onRegionClick,
  className,
  zoom = 1,
}: BodyMapProps) {
  const regions = regionsForView(view)
  const hidden = useMemo(() => new Set(hiddenMuscleIds), [hiddenMuscleIds])
  const isolated = useMemo(() => new Set(isolatedMuscleIds), [isolatedMuscleIds])
  const muscleById = useMemo(() => new Map(MUSCLES.map((m) => [m.id, m])), [])

  const hasHighlights = (highlights?.size ?? 0) > 0

  // Zoom by shrinking the viewBox around the figure's centre.
  const viewBox = useMemo(() => {
    const [x, y, w, h] = BODY_VIEWBOX.split(' ').map(Number)
    const z = Math.max(0.5, Math.min(3, zoom))
    const nw = w / z
    const nh = h / z
    return `${x + (w - nw) / 2} ${y + (h - nh) / 2} ${nw} ${nh}`
  }, [zoom])

  /** Resolve how a region should be painted, given all the current filters. */
  function paintRegion(regionId: string) {
    const candidateIds = musclesInRegion(regionId).filter((id) => {
      const muscle = muscleById.get(id)
      if (!muscle) return false
      if (hidden.has(id)) return false
      if (isolated.size > 0 && !isolated.has(id)) return false
      if (muscle.layer === 'superficial' && !layers.superficial) return false
      if (muscle.layer === 'deep' && !layers.deep) return false
      return true
    })

    if (candidateIds.length === 0) return null

    const isSelected = selectedMuscleId !== null && candidateIds.includes(selectedMuscleId)
    const anyDeep = candidateIds.some((id) => muscleById.get(id)?.layer === 'deep')
    const allDeep = candidateIds.every((id) => muscleById.get(id)?.layer === 'deep')

    // Strongest role wins when a region contains several highlighted muscles.
    let best: { id: string; role: MuscleRole; emphasis: number } | null = null
    if (highlights) {
      for (const id of candidateIds) {
        const hit = highlights.get(id)
        if (!hit) continue
        if (!best || ROLE_RANK[hit.role] < ROLE_RANK[best.role] || (hit.role === best.role && hit.emphasis > best.emphasis)) {
          best = { id, role: hit.role, emphasis: hit.emphasis }
        }
      }
    }

    if (best) {
      const paint = paintFor(best.role, best.emphasis, intensity)
      return { ...paint, muscleIds: candidateIds, hatched: allDeep, isSelected, deep: anyDeep }
    }

    if (isSelected) {
      return {
        color: ANATOMY_BASE.selection,
        fillOpacity: 0.85,
        strokeOpacity: 1,
        glow: 5,
        muscleIds: candidateIds,
        hatched: allDeep,
        isSelected: true,
        deep: anyDeep,
      }
    }

    return {
      color: ANATOMY_BASE.muscleFill,
      fillOpacity: hasHighlights && dimUninvolved ? ANATOMY_BASE.dimOpacity : 0.9,
      strokeOpacity: 0.5,
      glow: 0,
      muscleIds: candidateIds,
      hatched: allDeep,
      isSelected: false,
      deep: anyDeep,
    }
  }

  const silhouette = Object.values(BODY_SILHOUETTE)

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label={`${view === 'anterior' ? 'Anterior' : 'Posterior'} anatomy body map`}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <pattern id="tr-deep-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="transparent" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#0A0D14" strokeWidth="2" opacity="0.55" />
        </pattern>
        <filter id="tr-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Skin / silhouette layer */}
      {layers.skin ? (
        <g>
          {silhouette.map((d, i) => (
            <g key={`sil-${i}`}>
              <path d={d} fill={ANATOMY_BASE.skinFill} stroke={ANATOMY_BASE.skinStroke} strokeWidth="1.2" />
              <path d={d} transform={MIRROR_TRANSFORM} fill={ANATOMY_BASE.skinFill} stroke={ANATOMY_BASE.skinStroke} strokeWidth="1.2" />
            </g>
          ))}
        </g>
      ) : null}

      {/* Bones layer */}
      {layers.bones ? (
        <g fill="none" stroke={ANATOMY_BASE.boneStroke} strokeWidth="2.4" strokeLinecap="round" opacity="0.75">
          {SKELETON_PATHS.map((d, i) => (
            <path key={`bone-${i}`} d={d} />
          ))}
        </g>
      ) : null}

      {/* Muscle regions */}
      {layers.superficial || layers.deep ? (
        <g>
          {regions.map((region) => {
            const paint = paintRegion(region.id)
            if (!paint) return null
            const interactive = Boolean(onRegionClick)
            const label = region.label
            const shapes = [
              { key: 'l', transform: undefined as string | undefined },
              { key: 'r', transform: MIRROR_TRANSFORM },
            ]
            return (
              <g key={region.id} filter={paint.glow > 0 ? 'url(#tr-glow)' : undefined}>
                {shapes.map(({ key, transform }) => (
                  <g key={key} transform={transform}>
                    <path
                      d={region.path}
                      className={`tr-region${interactive ? ' tr-region-interactive' : ''}`}
                      fill={paint.color}
                      fillOpacity={paint.fillOpacity}
                      stroke={paint.isSelected ? ANATOMY_BASE.selection : paint.color}
                      strokeOpacity={paint.strokeOpacity}
                      strokeWidth={paint.isSelected ? 2 : 0.9}
                      onClick={interactive ? () => onRegionClick?.(region.id, paint.muscleIds) : undefined}
                      tabIndex={interactive && key === 'l' ? 0 : undefined}
                      role={interactive && key === 'l' ? 'button' : undefined}
                      aria-label={interactive && key === 'l' ? label : undefined}
                      onKeyDown={
                        interactive && key === 'l'
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                onRegionClick?.(region.id, paint.muscleIds)
                              }
                            }
                          : undefined
                      }
                    >
                      {key === 'l' ? <title>{label}</title> : null}
                    </path>
                    {paint.hatched ? <path d={region.path} fill="url(#tr-deep-hatch)" pointerEvents="none" opacity={0.8} /> : null}
                  </g>
                ))}
              </g>
            )
          })}
        </g>
      ) : null}

      {/* Joint markers */}
      {layers.joints ? (
        <g>
          {JOINT_MARKERS.map((j, i) => (
            <circle key={`joint-${i}`} cx={j.cx} cy={j.cy} r={j.r} fill="none" stroke={ANATOMY_BASE.boneStroke} strokeWidth="1.6" opacity="0.85">
              <title>{j.label}</title>
            </circle>
          ))}
        </g>
      ) : null}
    </svg>
  )
}

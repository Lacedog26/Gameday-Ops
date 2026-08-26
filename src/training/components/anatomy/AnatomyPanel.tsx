import { useMemo, useState } from 'react'
import type { MuscleRole } from '../../data/types'
import { MUSCLE_BY_ID } from '../../data/muscles'
import { EMPHASIS_DISCLAIMER, EMPHASIS_LABEL, ROLE_ORDER, ROLE_STYLES } from '../../config/visual'
import BodyMap, { DEFAULT_LAYERS, type AnatomyLayers, type Highlight } from './BodyMap'
import { Button, cx, Eyebrow } from '../ui'

// ---------------------------------------------------------------------------
// The anatomy viewer chrome: view switching, layer toggles, zoom, isolate and
// the role legend. The renderer inside is swappable — today it is the 2D body
// map, in Phase 2 it becomes the three.js viewer behind the same props.
// ---------------------------------------------------------------------------

/**
 * Camera presets. Anterior and posterior are real in the 2D map; the remaining
 * presets need a 3D model and are shown disabled rather than faked.
 */
const VIEW_PRESETS = [
  { id: 'anterior', label: 'Front', available: true },
  { id: 'posterior', label: 'Back', available: true },
  { id: 'left', label: 'Left', available: false },
  { id: 'right', label: 'Right', available: false },
  { id: 'superior', label: 'Sup.', available: false },
  { id: 'inferior', label: 'Inf.', available: false },
] as const

export interface AnatomyPanelProps {
  highlights?: Map<string, Highlight>
  view: 'anterior' | 'posterior'
  onViewChange: (view: 'anterior' | 'posterior') => void
  selectedMuscleId?: string | null
  onSelectMuscle?: (muscleId: string | null) => void
  isolatedMuscleIds?: string[]
  intensity?: number
  /** Show the primary/secondary/stabilizer legend. */
  showLegend?: boolean
  /** Compact mode drops the layer controls (used inside the exercise page). */
  compact?: boolean
  heightClass?: string
}

export default function AnatomyPanel({
  highlights,
  view,
  onViewChange,
  selectedMuscleId = null,
  onSelectMuscle,
  isolatedMuscleIds = [],
  intensity = 1,
  showLegend = true,
  compact = false,
  heightClass = 'h-[520px]',
}: AnatomyPanelProps) {
  const [layers, setLayers] = useState<AnatomyLayers>(DEFAULT_LAYERS)
  const [zoom, setZoom] = useState(1)
  const [regionPick, setRegionPick] = useState<string[] | null>(null)

  const toggleLayer = (key: keyof AnatomyLayers) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }))

  const rolesPresent = useMemo(() => {
    const set = new Set<MuscleRole>()
    if (highlights) for (const h of highlights.values()) set.add(h.role)
    return ROLE_ORDER.filter((r) => set.has(r))
  }, [highlights])

  function handleRegionClick(_regionId: string, muscleIds: string[]) {
    if (!onSelectMuscle) return
    if (muscleIds.length === 1) {
      onSelectMuscle(muscleIds[0] === selectedMuscleId ? null : muscleIds[0])
      setRegionPick(null)
      return
    }
    // Several muscles share the region — let the user choose which one.
    setRegionPick(muscleIds)
  }

  return (
    <div className="tr-card overflow-hidden rounded-md">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-tr-line px-3 py-2.5">
        <div className="flex items-center gap-1" role="group" aria-label="Camera view">
          {VIEW_PRESETS.map((preset) => {
            const active = preset.available && view === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                disabled={!preset.available}
                title={preset.available ? `${preset.label} view` : 'Available once a 3D anatomy model is installed (Phase 2)'}
                onClick={() => preset.available && onViewChange(preset.id as 'anterior' | 'posterior')}
                className={cx(
                  'rounded-[3px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
                  active ? 'bg-tr-accent text-[#04120E]' : 'text-tr-muted hover:bg-tr-hi hover:text-tr-text',
                  !preset.available && 'cursor-not-allowed text-tr-dim/50 hover:bg-transparent hover:text-tr-dim/50',
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.2).toFixed(2)))}
            className="h-7 w-7 rounded-[3px] text-tr-muted hover:bg-tr-hi hover:text-tr-text"
          >
            −
          </button>
          <span className="tr-mono w-11 text-center text-[11px] text-tr-dim">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(2.6, +(z + 0.2).toFixed(2)))}
            className="h-7 w-7 rounded-[3px] text-tr-muted hover:bg-tr-hi hover:text-tr-text"
          >
            +
          </button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setZoom(1)
              setLayers(DEFAULT_LAYERS)
              onSelectMuscle?.(null)
              setRegionPick(null)
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Layer controls */}
      {!compact ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-tr-line px-3 py-2">
          <Eyebrow className="mr-1">Layers</Eyebrow>
          {(
            [
              ['skin', 'Skin'],
              ['superficial', 'Superficial'],
              ['deep', 'Deep'],
              ['bones', 'Bones'],
              ['joints', 'Joints'],
            ] as [keyof AnatomyLayers, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={layers[key]}
              onClick={() => toggleLayer(key)}
              className={cx(
                'rounded-[3px] border px-2 py-[3px] text-[11px] font-medium transition-colors',
                layers[key] ? 'border-tr-accent/60 bg-[#0A2A24] text-tr-accent' : 'border-tr-line text-tr-dim hover:text-tr-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Viewport */}
      <div className={cx('relative flex items-center justify-center bg-[#080B11] px-4 py-3', heightClass)}>
        {/* The figure is tall and narrow — capping the width keeps it from
            floating in a sea of empty panel on wide screens. */}
        <div className="h-full w-full max-w-[min(100%,340px)]">
          <BodyMap
            view={view}
            highlights={highlights}
            layers={layers}
            selectedMuscleId={selectedMuscleId}
            isolatedMuscleIds={isolatedMuscleIds}
            intensity={intensity}
            zoom={zoom}
            onRegionClick={onSelectMuscle ? handleRegionClick : undefined}
            className="max-h-full"
          />
        </div>

        {!regionPick ? (
          <span className="tr-eyebrow absolute left-3 top-3 text-tr-dim/70">{view === 'anterior' ? 'Anterior' : 'Posterior'}</span>
        ) : null}

        {/* Region disambiguation picker. Anchored to the top of the viewport so
            it stays on screen no matter how tall the panel is. */}
        {regionPick ? (
          <div className="absolute left-1/2 top-3 w-[min(92%,340px)] -translate-x-1/2 rounded-[3px] border border-tr-line2 bg-tr-raised p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow>Muscles in this region</Eyebrow>
              <button type="button" onClick={() => setRegionPick(null)} className="text-[11px] text-tr-dim hover:text-tr-text">
                Close
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {regionPick.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSelectMuscle?.(id)
                    setRegionPick(null)
                  }}
                  className="rounded-[3px] border border-tr-line px-2 py-1 text-[11.5px] text-tr-muted hover:border-tr-accent hover:text-tr-accent"
                >
                  {MUSCLE_BY_ID[id]?.name ?? id}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Legend */}
      {showLegend && rolesPresent.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-tr-line px-3 py-2.5">
          {rolesPresent.map((role) => (
            <span key={role} className="flex items-center gap-1.5" title={ROLE_STYLES[role].hint}>
              <span className="h-2.5 w-2.5 rounded-[1px]" style={{ background: ROLE_STYLES[role].color }} />
              <span className="text-[11.5px] text-tr-muted">{ROLE_STYLES[role].label}</span>
            </span>
          ))}
          <span className="tr-mono ml-auto text-[10px] text-tr-dim" title={EMPHASIS_DISCLAIMER}>
            {EMPHASIS_LABEL.toUpperCase()} — EDITORIAL, NOT EMG
          </span>
        </div>
      ) : null}
    </div>
  )
}

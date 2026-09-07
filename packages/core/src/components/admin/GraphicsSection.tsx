import { useRef, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import type { CultureGraphic } from '../../types'
import { Section, TextInput, Button, IconButton } from './ui'

/**
 * Manage team-culture graphics. Files are read as data URLs and stored verbatim
 * (no re-encoding) so transparency and original artwork are preserved. Supports
 * PNG, GIF, SVG, JPG, WEBP.
 */
export default function GraphicsSection() {
  const { state, actions } = useDashboard()
  const graphics = [...state.graphics].sort((a, b) => a.order - b.order)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    setError('')
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not an image.`)
        continue
      }
      // ~4MB guard — data URLs live in localStorage which is size-limited.
      if (file.size > 4 * 1024 * 1024) {
        setError(`"${file.name}" is larger than 4MB; please optimize it first.`)
        continue
      }
      const dataUrl = await readAsDataURL(file)
      actions.addGraphic({
        name: file.name.replace(/\.[^.]+$/, ''),
        src: dataUrl,
        enabled: true,
        order: state.graphics.length,
      })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Section
      title="Team Culture Graphics"
      subtitle="Rotating motivation panel · PNG / GIF / SVG · transparency preserved"
    >
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onFiles(e.dataTransfer.files)
        }}
        className="mb-5 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-navy-950/40 px-4 py-6 text-center"
      >
        <p className="text-slate-300">Drag &amp; drop graphics here, or</p>
        <Button onClick={() => fileRef.current?.click()}>Choose Files</Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        {error && <p className="text-sm text-bills-red">{error}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {graphics.map((g, i) => (
          <GraphicCard
            key={g.id}
            graphic={g}
            isFirst={i === 0}
            isLast={i === graphics.length - 1}
            defaultDuration={state.settings.cultureRotationSec}
            onChange={(patch) => actions.updateGraphic(g.id, patch)}
            onDelete={() => actions.deleteGraphic(g.id)}
            onUp={() => actions.reorderGraphics(i, i - 1)}
            onDown={() => actions.reorderGraphics(i, i + 1)}
          />
        ))}
      </div>
      {graphics.length === 0 && (
        <p className="py-4 text-center text-slate-500">No graphics yet.</p>
      )}
    </Section>
  )
}

function GraphicCard({
  graphic,
  isFirst,
  isLast,
  defaultDuration,
  onChange,
  onDelete,
  onUp,
  onDown,
}: {
  graphic: CultureGraphic
  isFirst: boolean
  isLast: boolean
  defaultDuration: number
  onChange: (patch: Partial<CultureGraphic>) => void
  onDelete: () => void
  onUp: () => void
  onDown: () => void
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 ${
        graphic.enabled ? 'border-white/15 bg-navy-950/60' : 'border-white/5 bg-navy-950/30 opacity-60'
      }`}
    >
      {/* Checkerboard shows transparency clearly */}
      <div
        className="grid h-28 place-items-center overflow-hidden rounded-lg"
        style={{
          backgroundImage:
            'linear-gradient(45deg,#1b2540 25%,transparent 25%),linear-gradient(-45deg,#1b2540 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1b2540 75%),linear-gradient(-45deg,transparent 75%,#1b2540 75%)',
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0,0 9px,9px -9px,-9px 0',
          backgroundColor: '#0c1220',
        }}
      >
        <img src={graphic.src} alt={graphic.name} className="max-h-full max-w-full object-contain p-2" />
      </div>

      <TextInput
        value={graphic.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="py-1.5 text-sm"
      />

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-slate-400">
          Secs
          <TextInput
            type="number"
            min={5}
            value={graphic.durationSec ?? ''}
            placeholder={String(defaultDuration)}
            onChange={(e) =>
              onChange({ durationSec: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-16 py-1 text-sm"
          />
        </label>
        <button
          title="Background behind the artwork"
          onClick={() => onChange({ matte: graphic.matte === 'light' ? 'none' : 'light' })}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
            graphic.matte === 'light'
              ? 'bg-white text-navy-950'
              : 'bg-white/10 text-slate-300'
          }`}
        >
          {graphic.matte === 'light' ? 'WHITE BG' : 'CLEAR BG'}
        </button>
        <div className="ml-auto flex items-center gap-1">
          <IconButton title="Move up" disabled={isFirst} onClick={onUp}>
            ↑
          </IconButton>
          <IconButton title="Move down" disabled={isLast} onClick={onDown}>
            ↓
          </IconButton>
          <button
            onClick={() => onChange({ enabled: !graphic.enabled })}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              graphic.enabled ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-300'
            }`}
          >
            {graphic.enabled ? 'ON' : 'OFF'}
          </button>
          <IconButton
            title="Delete graphic"
            onClick={() => {
              if (confirm(`Delete "${graphic.name}"?`)) onDelete()
            }}
          >
            🗑
          </IconButton>
        </div>
      </div>
    </div>
  )
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

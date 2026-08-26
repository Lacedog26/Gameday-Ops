import { useRef, useState } from 'react'
import { TRAINING_STORAGE_KEY } from '../state/persistence'
import { useTraining } from '../state/store'
import BodyMap from '../components/anatomy/BodyMap'
import { ANATOMY_ASSET_DIR, activeAnatomyModel } from '../config/anatomyAssets'
import { Button, Card, Eyebrow, PageHeader, PlaceholderNote, SectionTitle, Select, StatLine, Toggle, cx } from '../components/ui'

// ---------------------------------------------------------------------------
// Settings, plus data import/export. The export is the complete local blob —
// exercises, workouts, programs, favorites and settings — so it round-trips.
// ---------------------------------------------------------------------------

const PREVIEW_HIGHLIGHTS = new Map<string, { role: 'primary' | 'secondary' | 'stabilizer'; emphasis: number }>([
  ['gluteus-maximus', { role: 'primary', emphasis: 92 }],
  ['hamstrings-biceps-femoris', { role: 'secondary', emphasis: 65 }],
  ['gluteus-medius', { role: 'stabilizer', emphasis: 45 }],
])

export default function Settings() {
  const { data, updateSettings, exportData, importData, resetAll, storageOk, exercises } = useTraining()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')

  function download() {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `training-anatomy-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setStatus({ ok: true, message: 'Export downloaded.' })
  }

  async function onFile(file: File) {
    try {
      const text = await file.text()
      setStatus(importData(text, importMode))
    } catch {
      setStatus({ ok: false, message: 'Could not read that file.' })
    }
  }

  const model = activeAnatomyModel()

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Settings" title="Settings" subtitle="Preferences and data, all stored locally on this device." />

      <div className="space-y-5">
        <Card className="p-4">
          <SectionTitle>Anatomy visuals</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-[1fr_170px]">
            <div className="space-y-3">
              <div>
                <Eyebrow className="mb-2">Highlight intensity</Eyebrow>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.4}
                    max={1.4}
                    step={0.05}
                    value={data.settings.highlightIntensity}
                    onChange={(e) => updateSettings({ highlightIntensity: Number(e.target.value) })}
                    aria-label="Highlight intensity"
                    className="flex-1"
                  />
                  <span className="tr-mono w-10 text-right text-[12px] text-tr-dim">{Math.round(data.settings.highlightIntensity * 100)}%</span>
                </div>
                <p className="mt-1.5 text-[11.5px] text-tr-dim">
                  Scales every muscle highlight at once. Role colours themselves live in{' '}
                  <span className="tr-mono">src/training/config/visual.ts</span>.
                </p>
              </div>

              <Toggle
                checked={data.settings.showEmphasisValues}
                onChange={(v) => updateSettings({ showEmphasisValues: v })}
                label="Show training emphasis values"
                hint="Displays the 0–100 editorial weighting next to each muscle. These are coaching judgements, not EMG measurements."
              />

              <Toggle
                checked={data.settings.reducedMotion}
                onChange={(v) => updateSettings({ reducedMotion: v })}
                label="Reduce motion"
                hint="Disables transitions across the module. Your operating-system setting is honoured regardless."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="tr-eyebrow mb-1.5 block text-tr-dim">Default anatomy view</span>
                  <Select
                    value={data.settings.defaultAnatomyView}
                    onChange={(e) => updateSettings({ defaultAnatomyView: e.target.value as 'anterior' | 'posterior' })}
                  >
                    <option value="anterior">Anterior (front)</option>
                    <option value="posterior">Posterior (back)</option>
                  </Select>
                </label>
                <label className="block">
                  <span className="tr-eyebrow mb-1.5 block text-tr-dim">Units</span>
                  <Select value={data.settings.units} onChange={(e) => updateSettings({ units: e.target.value as 'metric' | 'imperial' })}>
                    <option value="imperial">Imperial (yd)</option>
                    <option value="metric">Metric (m)</option>
                  </Select>
                </label>
              </div>
            </div>

            <div className="rounded-[3px] border border-tr-line bg-[#080B11] p-2">
              <Eyebrow className="mb-1 text-center">Preview</Eyebrow>
              <BodyMap view="posterior" highlights={PREVIEW_HIGHLIGHTS} intensity={data.settings.highlightIntensity} className="h-[240px]" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle>Anatomy asset</SectionTitle>
          {model ? (
            <>
              <StatLine label="Active model" value={model.name} />
              <StatLine label="Format" value={model.format.toUpperCase()} />
              <StatLine label="Licence" value={model.license} />
              <StatLine label="Path" value={<span className="tr-mono text-[11.5px]">{model.url}</span>} />
            </>
          ) : (
            <PlaceholderNote>
              No 3D anatomy model installed — the app is using its built-in 2D body map. Place a GLB in{' '}
              <span className="tr-mono">{ANATOMY_ASSET_DIR}</span> and register it in{' '}
              <span className="tr-mono">src/training/config/anatomyAssets.ts</span>. Muscles bind to meshes by their{' '}
              <span className="tr-mono">anatomyModelId</span>, so no exercise data changes.
            </PlaceholderNote>
          )}
        </Card>

        <Card className="p-4">
          <SectionTitle hint="Everything here lives in this browser only. Nothing is sent anywhere.">Data</SectionTitle>

          <StatLine label="Built-in exercises" value={exercises.length - data.customExercises.length} />
          <StatLine label="My exercises" value={data.customExercises.length} />
          <StatLine label="Workouts" value={data.workouts.length} />
          <StatLine label="Programs" value={data.programs.length} />
          <StatLine
            label="Favorites"
            value={
              data.favorites.exercises.length + data.favorites.muscles.length + data.favorites.workouts.length + data.favorites.programs.length
            }
          />
          <StatLine label="Storage key" value={<span className="tr-mono text-[11.5px]">{TRAINING_STORAGE_KEY}</span>} />
          <StatLine
            label="Local storage"
            value={storageOk ? <span className="text-tr-accent">Available</span> : <span className="text-tr-primary">Unavailable</span>}
          />

          {!storageOk ? (
            <div className="mt-3">
              <PlaceholderNote>
                This browser is blocking local storage (private window, or site data disabled). The app still works, but nothing you create will
                survive a reload. Export before closing the tab.
              </PlaceholderNote>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-tr-line pt-4">
            <Button variant="primary" onClick={download}>
              Export JSON
            </Button>

            <div className="flex items-center gap-1 rounded-[3px] border border-tr-line p-1">
              {(['merge', 'replace'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setImportMode(mode)}
                  className={cx(
                    'rounded-[2px] px-2 py-1 text-[11.5px] font-medium capitalize transition-colors',
                    importMode === mode ? 'bg-tr-accent text-[#04120E]' : 'text-tr-muted hover:text-tr-text',
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onFile(file)
                e.target.value = ''
              }}
            />

            <Button
              variant="danger"
              className="ml-auto"
              onClick={() => {
                if (window.confirm('Delete all local training data — exercises, workouts, programs, favorites and settings? This cannot be undone.')) {
                  resetAll()
                  setStatus({ ok: true, message: 'All local data cleared.' })
                }
              }}
            >
              Reset all data
            </Button>
          </div>

          <p className="mt-2 text-[11.5px] text-tr-dim">
            <strong className="text-tr-muted">Merge</strong> keeps what you have and adds the file's contents.{' '}
            <strong className="text-tr-muted">Replace</strong> discards your current data first.
          </p>

          {status ? (
            <p role="status" className={cx('mt-3 text-[12.5px]', status.ok ? 'text-tr-accent' : 'text-tr-primary')}>
              {status.message}
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  )
}

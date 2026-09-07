import { useDashboard } from '../../context/DashboardContext'
import { STORAGE_KEY } from '../../lib/storage'
import { Section, Button } from './ui'

/** Destructive actions: export/import config and full reset. */
export default function DangerSection() {
  const { state, actions } = useDashboard()

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bills-pregame-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importConfig = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      // Minimal validation: must at least carry activeEvents + game.
      if (!parsed.game || !Array.isArray(parsed.activeEvents)) {
        alert('That file does not look like a valid dashboard config.')
        return
      }
      // Persist directly then reload so the provider hydrates from storage.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      window.location.reload()
    } catch {
      alert('Could not read that file.')
    }
  }

  return (
    <Section title="Backup & Reset" subtitle="Export config, import a backup, or restore defaults">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={exportConfig}>
          ⬇ Export Config
        </Button>
        <label>
          <span className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
            ⬆ Import Config
          </span>
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importConfig(e.target.files[0])}
          />
        </label>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm('Reset EVERYTHING to defaults? This cannot be undone.')) actions.reset()
          }}
        >
          Reset to Defaults
        </Button>
      </div>
    </Section>
  )
}

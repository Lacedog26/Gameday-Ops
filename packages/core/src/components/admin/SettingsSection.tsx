import { useDashboard } from '../../context/DashboardContext'
import type { TransitionStyle } from '../../types'
import { Section, Field, Select, Toggle } from './ui'

/** Display, sound, and accessibility preferences. */
export default function SettingsSection() {
  const { state, actions } = useDashboard()
  const { settings } = state

  return (
    <Section title="Display & Alert Settings" subtitle="Sound, accessibility, culture rotation">
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          label="Alert sounds"
          checked={settings.soundEnabled}
          onChange={(v) => actions.setSettings({ soundEnabled: v })}
        />
        <Toggle
          label="Colorblind-friendly alerts"
          checked={settings.colorblindMode}
          onChange={(v) => actions.setSettings({ colorblindMode: v })}
        />
        <Toggle
          label="Keep TV screen awake"
          checked={settings.keepAwake}
          onChange={(v) => actions.setSettings({ keepAwake: v })}
        />
        <Toggle
          label="Show weather in header"
          checked={settings.showWeather}
          onChange={(v) => actions.setSettings({ showWeather: v })}
        />

        <Field label={`Alert volume — ${Math.round(settings.volume * 100)}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => actions.setSettings({ volume: Number(e.target.value) })}
            className="accent-bills-red"
          />
        </Field>

        <Field label={`Culture rotation — ${settings.cultureRotationSec}s`}>
          <input
            type="range"
            min={10}
            max={60}
            step={1}
            value={settings.cultureRotationSec}
            onChange={(e) => actions.setSettings({ cultureRotationSec: Number(e.target.value) })}
            className="accent-bills-royal"
          />
        </Field>

        <Field label="Culture transition">
          <Select
            value={settings.cultureTransition}
            onChange={(e) =>
              actions.setSettings({ cultureTransition: e.target.value as TransitionStyle })
            }
          >
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
          </Select>
        </Field>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-navy-950/50 p-3 text-xs text-slate-400">
        <span className="font-bold text-slate-300">Keyboard shortcuts (on the board):</span>{' '}
        <kbd className="rounded bg-white/10 px-1.5">F</kbd> fullscreen ·{' '}
        <kbd className="rounded bg-white/10 px-1.5">S</kbd> sound ·{' '}
        <kbd className="rounded bg-white/10 px-1.5">C</kbd> colorblind ·{' '}
        <kbd className="rounded bg-white/10 px-1.5">Space</kbd> acknowledge GO NOW
      </div>
    </Section>
  )
}

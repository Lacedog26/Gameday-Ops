import { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import type { TemplateKind } from '../../types'
import { Section, Field, TextInput, Select, Button, IconButton } from './ui'

const KINDS: { value: TemplateKind; label: string }[] = [
  { value: 'regular', label: 'Regular Season' },
  { value: 'preseason', label: 'Preseason' },
  { value: 'playoffs', label: 'Playoffs' },
  { value: 'primetime', label: 'Primetime' },
  { value: 'international', label: 'International' },
  { value: 'custom', label: 'Custom' },
]

/** Save / load / manage reusable schedule templates. */
export default function TemplatesSection() {
  const { state, actions } = useDashboard()
  const { templates } = state
  const [name, setName] = useState('')
  const [kind, setKind] = useState<TemplateKind>('custom')

  const saveAsNew = () => {
    const finalName = name.trim() || `Custom ${new Date().toLocaleDateString()}`
    actions.saveTemplate(finalName, kind)
    setName('')
  }

  return (
    <Section title="Schedule Templates" subtitle="Save the current schedule, or load a preset">
      <div className="mb-5 flex flex-col gap-2">
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-navy-950/50 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold">{t.name}</span>
                {t.builtIn && (
                  <span className="rounded bg-bills-royal/40 px-2 py-0.5 text-[10px] font-bold tracking-widest text-sky-200">
                    PRESET
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                {t.events.length} events · {t.description ?? t.kind}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="success" onClick={() => actions.loadTemplate(t.id)}>
                Load
              </Button>
              <Button variant="ghost" onClick={() => actions.saveTemplate(t.name, t.kind, t.id)}>
                Update
              </Button>
              <IconButton
                title="Delete template"
                disabled={t.builtIn}
                onClick={() => {
                  if (confirm(`Delete template "${t.name}"?`)) actions.deleteTemplate(t.id)
                }}
              >
                🗑
              </IconButton>
            </div>
          </div>
        ))}
      </div>

      <div className="grid items-end gap-3 sm:grid-cols-[1fr_200px_auto]">
        <Field label="Save current schedule as">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New template name"
          />
        </Field>
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as TemplateKind)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button onClick={saveAsNew}>Save as Template</Button>
      </div>
    </Section>
  )
}

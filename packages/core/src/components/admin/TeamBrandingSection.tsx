import { useRef, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { getTeam } from '../../product'
import { resolveColors, resolveTeam } from '../../brand'
import { Section, Field, Button, TextInput } from './ui'

/**
 * Team Branding — the white-label control center. An org admin edits the
 * selected team's colors and logo/asset library here; the live dashboard reads
 * the merged result, so selecting a different school re-skins the whole board.
 * Nothing is hard-coded per team — onboarding a customer is configuration.
 */
export default function TeamBrandingSection() {
  const { state, actions } = useDashboard()
  const teamId = state.game.teamId
  const team = getTeam(teamId)
  const branding = state.teamBranding?.[teamId]
  const colors = resolveColors(team, branding)
  const identity = resolveTeam(team, branding)

  const setColor = (key: 'primary' | 'secondary' | 'accent' | 'background' | 'text', value: string) =>
    actions.patchTeamBranding(teamId, { colors: { [key]: value } })
  const setId = (key: 'name' | 'shortName' | 'abbr', value: string) =>
    actions.patchTeamBranding(teamId, { [key]: value })

  return (
    <Section title="Team Branding" subtitle={`Identity, colors & assets for ${identity.name} — the board themes to these live`}>
      <div className="flex flex-col gap-6">
        {/* Identity */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Identity</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Team Name">
              <TextInput value={identity.name} onChange={(e) => setId('name', e.target.value)} />
            </Field>
            <Field label="Short Name">
              <TextInput value={identity.shortName} onChange={(e) => setId('shortName', e.target.value)} />
            </Field>
            <Field label="Abbreviation">
              <TextInput value={identity.abbr} onChange={(e) => setId('abbr', e.target.value)} maxLength={5} />
            </Field>
          </div>
        </div>

        {/* Colors */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Colors</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ColorField label="Primary" value={colors.primary} onChange={(v) => setColor('primary', v)} />
            <ColorField label="Secondary" value={colors.secondary} onChange={(v) => setColor('secondary', v)} />
            <ColorField label="Accent" value={colors.accent} onChange={(v) => setColor('accent', v)} />
            <ColorField
              label="Background"
              value={colors.background || colors.primary}
              onChange={(v) => setColor('background', v)}
            />
            <ColorField label="Text" value={colors.text} onChange={(v) => setColor('text', v)} />
          </div>
        </div>

        {/* Primary logo (with crop framing, stored in teamLogos) */}
        <PrimaryLogo teamId={teamId} teamName={team.name} />

        {/* Additional brand assets */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Brand Assets</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <AssetSlot
              label="Secondary Logo"
              url={branding?.secondaryLogoUrl}
              onUpload={(url) => actions.patchTeamBranding(teamId, { secondaryLogoUrl: url })}
              onClear={() => actions.patchTeamBranding(teamId, { secondaryLogoUrl: undefined })}
            />
            <AssetSlot
              label="Wordmark"
              url={branding?.wordmarkUrl}
              onUpload={(url) => actions.patchTeamBranding(teamId, { wordmarkUrl: url })}
              onClear={() => actions.patchTeamBranding(teamId, { wordmarkUrl: undefined })}
            />
            <AssetSlot
              label="Background Image"
              url={branding?.backgroundImageUrl}
              onUpload={(url) => actions.patchTeamBranding(teamId, { backgroundImageUrl: url })}
              onClear={() => actions.patchTeamBranding(teamId, { backgroundImageUrl: undefined })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-xs text-slate-500">
            Upload only artwork you are authorized to display. Assets are stored with {team.name}.
          </p>
          <Button variant="ghost" onClick={() => actions.resetTeamBranding(teamId)}>
            Reset to defaults
          </Button>
        </div>
      </div>
    </Section>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const hex = normalizeHex(value)
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="w-full rounded-lg border border-white/15 bg-navy-950/80 px-3 py-2 font-mono text-sm uppercase text-white outline-none focus:border-team-primary"
        />
      </div>
    </Field>
  )
}

function PrimaryLogo({ teamId, teamName }: { teamId: string; teamName: string }) {
  const { state, actions } = useDashboard()
  const logo = state.teamLogos[teamId]
  const shipped = getTeam(teamId).assets.primaryLogoUrl // shown until a custom one is uploaded
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const onFile = async (file?: File) => {
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) return setError('Choose an image (PNG, SVG, JPG).')
    if (file.size > 4 * 1024 * 1024) return setError('Image is larger than 4MB; optimize it first.')
    const url = await readAsDataURL(file)
    actions.setTeamLogo(teamId, { url, zoom: 1, offsetY: 0 })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Primary Logo</h3>
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="flex flex-col items-center gap-2">
          <div className="grid h-[120px] w-[120px] place-items-center overflow-hidden rounded-xl border border-white/15 bg-navy-950/70">
            {logo?.url ? (
              <img
                src={logo.url}
                alt="logo preview"
                className="h-full w-full object-contain"
                style={{ transform: `scale(${logo.zoom}) translateY(${logo.offsetY}%)` }}
              />
            ) : shipped ? (
              <img src={shipped} alt="logo preview" className="h-full w-full object-contain" />
            ) : (
              <span className="px-2 text-center text-[11px] text-slate-500">No logo yet</span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">Header preview</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileRef.current?.click()}>{logo?.url ? 'Replace Logo' : 'Upload Logo'}</Button>
            {logo?.url && (
              <Button variant="ghost" onClick={() => actions.removeTeamLogo(teamId)}>
                Delete
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {error && <p className="text-sm text-team-secondary">{error}</p>}
          {logo?.url && (
            <>
              <Field label={`Zoom — ${logo.zoom.toFixed(2)}× (crop out a wordmark)`}>
                <input
                  type="range" min={1} max={3} step={0.02} value={logo.zoom}
                  onChange={(e) => actions.setTeamLogo(teamId, { zoom: Number(e.target.value) })}
                  className="accent-team-primary"
                />
              </Field>
              <Field label={`Vertical position — ${logo.offsetY}%`}>
                <input
                  type="range" min={-60} max={60} step={1} value={logo.offsetY}
                  onChange={(e) => actions.setTeamLogo(teamId, { offsetY: Number(e.target.value) })}
                  className="accent-team-primary"
                />
              </Field>
            </>
          )}
          <p className="text-[11px] text-slate-500">Shown top-left on the board for {teamName}. Aspect ratio preserved — never stretched.</p>
        </div>
      </div>
    </div>
  )
}

function AssetSlot({
  label,
  url,
  onUpload,
  onClear,
}: {
  label: string
  url?: string
  onUpload: (dataUrl: string) => void
  onClear: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const onFile = async (file?: File) => {
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) return setError('Choose an image.')
    if (file.size > 5 * 1024 * 1024) return setError('Larger than 5MB.')
    onUpload(await readAsDataURL(file))
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Field label={label}>
      <div className="flex flex-col gap-2">
        <div className="grid h-[88px] place-items-center overflow-hidden rounded-lg border border-white/15 bg-navy-950/70 bg-[linear-gradient(45deg,#0d1424_25%,transparent_25%,transparent_75%,#0d1424_75%),linear-gradient(45deg,#0d1424_25%,transparent_25%,transparent_75%,#0d1424_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px]">
          {url ? (
            <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-slate-500">None</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-lg bg-team-primary/80 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-team-primary"
          >
            {url ? 'Replace' : 'Upload'}
          </button>
          {url && (
            <button
              onClick={onClear}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/20"
            >
              Delete
            </button>
          )}
        </div>
        {error && <p className="text-[11px] text-team-secondary">{error}</p>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
    </Field>
  )
}

function normalizeHex(v: string): string {
  const m = v.trim().match(/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/)
  if (!m) return '#000000'
  const h = m[1]
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return `#${full}`
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

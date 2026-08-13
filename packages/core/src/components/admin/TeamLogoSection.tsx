import { useRef, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { getTeam } from '../../product'
import { Section, Field, Button } from './ui'

/**
 * Upload a team's own (licensed) logo and frame it. The zoom + vertical offset
 * let you crop out a wordmark (e.g. the "BILLS" text) using a uniform scale, so
 * the artwork is never stretched or distorted. Nothing is generated — the
 * uploaded file is used as-is. When set, it replaces the placeholder mark in
 * the header for that team.
 */
export default function TeamLogoSection() {
  const { state, actions } = useDashboard()
  const teamId = state.game.teamId
  const team = getTeam(teamId)
  const logo = state.teamLogos[teamId]
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const onFile = async (file?: File) => {
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, SVG, JPG).')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Image is larger than 4MB; please optimize it first.')
      return
    }
    const url = await readAsDataURL(file)
    actions.setTeamLogo(teamId, { url, zoom: 1, offsetY: 0 })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Section
      title="Team Logo"
      subtitle={`Upload ${team.shortName}'s logo — crop out any wordmark below`}
    >
      <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
        {/* Live preview at header size */}
        <div className="flex flex-col items-center gap-2">
          <div className="grid h-[120px] w-[120px] place-items-center overflow-hidden rounded-xl border border-white/15 bg-navy-950/70">
            {logo?.url ? (
              <img
                src={logo.url}
                alt="logo preview"
                className="h-full w-full object-contain"
                style={{ transform: `scale(${logo.zoom}) translateY(${logo.offsetY}%)` }}
              />
            ) : (
              <span className="px-2 text-center text-xs text-slate-500">No logo uploaded</span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">Header preview</span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileRef.current?.click()}>
              {logo?.url ? 'Replace Logo' : 'Upload Logo'}
            </Button>
            {logo?.url && (
              <Button variant="ghost" onClick={() => actions.removeTeamLogo(teamId)}>
                Remove
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
          {error && <p className="text-sm text-bills-red">{error}</p>}

          {logo?.url && (
            <>
              <Field label={`Zoom — ${logo.zoom.toFixed(2)}× (crop in to drop a wordmark)`}>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.02}
                  value={logo.zoom}
                  onChange={(e) => actions.setTeamLogo(teamId, { zoom: Number(e.target.value) })}
                  className="accent-bills-royal"
                />
              </Field>
              <Field label={`Vertical position — ${logo.offsetY}% (move up to reveal the top mark)`}>
                <input
                  type="range"
                  min={-60}
                  max={60}
                  step={1}
                  value={logo.offsetY}
                  onChange={(e) => actions.setTeamLogo(teamId, { offsetY: Number(e.target.value) })}
                  className="accent-bills-royal"
                />
              </Field>
              <p className="text-xs text-slate-500">
                Tip: to show only a charging-mark and hide text underneath it, increase Zoom and
                move Vertical position up (negative) until only the mark is framed.
              </p>
            </>
          )}
          <p className="text-xs text-slate-500">
            Use only artwork you're authorized to display. Uploads are stored with this board and
            shown for {team.name}.
          </p>
        </div>
      </div>
    </Section>
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

import { useEffect, type ReactNode } from 'react'
import { useDashboard } from './DashboardContext'
import { getTeam } from '../product'
import type { TeamBrand } from '../types'

// ---------------------------------------------------------------------------
// White-label theming: reads the active team and writes its colors to CSS
// variables on <html>, so every `team-*` / `bills-*` Tailwind class and the
// field background re-theme instantly. No component hard-codes a team color.
// ---------------------------------------------------------------------------

/** "#00338D" -> "0 51 141" (space-separated RGB channels for Tailwind alpha). */
function hexToChannels(hex: string): string {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return `${r} ${g} ${b}`
}

function parseHex(hex: string): [number, number, number] {
  return hexToChannels(hex).split(' ').map(Number) as [number, number, number]
}

/** Mix a color toward a target by t (0..1). */
function mix(hex: string, target: [number, number, number], amt: number): string {
  const [r, g, b] = parseHex(hex)
  const m = (a: number, t: number) => Math.round(a + (t - a) * amt)
  return `${m(r, target[0])} ${m(g, target[1])} ${m(b, target[2])}`
}

const BLACK: [number, number, number] = [4, 7, 15]
const WHITE: [number, number, number] = [255, 255, 255]

/** Compute all theme CSS variables for a team. */
export function themeVars(team: TeamBrand): Record<string, string> {
  const { primary, secondary, accent } = team.colors
  return {
    '--team-primary': hexToChannels(primary),
    '--team-primary-light': mix(primary, WHITE, 0.24),
    '--team-secondary': hexToChannels(secondary),
    '--team-accent': hexToChannels(accent),
    // Dark, team-tinted background ramp so each team gets its own backdrop.
    '--team-bg-1': mix(primary, BLACK, 0.62),
    '--team-bg-2': mix(primary, BLACK, 0.76),
    '--team-bg-3': mix(primary, BLACK, 0.86),
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { state } = useDashboard()
  const team = getTeam(state.game.teamId)

  useEffect(() => {
    const root = document.documentElement
    const vars = themeVars(team)
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  }, [team])

  return <>{children}</>
}

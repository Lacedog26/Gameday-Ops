import type { TeamBrand, TeamBranding } from './types'

// Merge a team's shipped brand defaults with an org admin's editable overrides.
// The live dashboard always consumes the RESOLVED brand, so onboarding a new
// customer (or restyling an existing one) is pure configuration — no code change.

export interface ResolvedColors {
  primary: string
  secondary: string
  accent: string
  text: string
  /** Optional base background color; the dark board ramp derives from it. */
  background?: string
}

export function resolveColors(team: TeamBrand, b?: TeamBranding): ResolvedColors {
  const c = b?.colors ?? {}
  return {
    primary: c.primary || team.colors.primary,
    secondary: c.secondary || team.colors.secondary,
    accent: c.accent || team.colors.accent,
    text: c.text || team.colors.text,
    background: c.background || undefined,
  }
}

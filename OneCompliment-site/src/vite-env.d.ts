/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GA_MEASUREMENT_ID?: string
  // Stripe Payment Link URLs for the three B2B tiers. Optional — when
  // missing, the tier card collapses to "Talk to sales" only.
  readonly VITE_STRIPE_TEAM_URL?: string
  readonly VITE_STRIPE_GROWTH_URL?: string
  readonly VITE_STRIPE_ENTERPRISE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

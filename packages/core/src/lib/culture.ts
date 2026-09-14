import type { CultureGraphic, Quote } from '../types'

// Pure culture-rotation logic (no React / no backend imports) so it can be unit
// tested directly. See CulturePanel for the rendering.

// A rotation slide is either an uploaded image or a text quote.
export type Slide =
  | { kind: 'image'; id: string; graphic: CultureGraphic; durationSec?: number }
  | { kind: 'quote'; id: string; quote: Quote }

/**
 * Build the culture rotation. The operator's own content (enabled uploaded
 * images + enabled text quotes, in order) IS the rotation. The team's shipped
 * default saying is only a FALLBACK, shown when the operator hasn't added
 * anything. Consequence: exactly one culture image → a single slide (shown
 * continuously); a second → two slides (rotation begins automatically).
 */
export function buildCultureSlides(opts: {
  teamSaying?: string
  graphics: CultureGraphic[]
  quotes: Quote[]
}): Slide[] {
  const g: Slide[] = opts.graphics
    .filter((x) => x.enabled)
    .sort((a, b) => a.order - b.order)
    .map((graphic) => ({ kind: 'image', id: graphic.id, graphic, durationSec: graphic.durationSec }))
  const q: Slide[] = opts.quotes
    .filter((x) => x.enabled)
    .sort((a, b) => a.order - b.order)
    .map((quote) => ({ kind: 'quote', id: quote.id, quote }))
  const own = [...g, ...q]
  if (own.length > 0) return own
  return opts.teamSaying
    ? [{ kind: 'quote', id: 'team-culture', quote: { id: 'team-culture', text: opts.teamSaying, enabled: true, order: -1, accent: 'white' } }]
    : []
}

/** The display rotates only when there is more than one slide. */
export function cultureShouldRotate(slides: Slide[]): boolean {
  return slides.length > 1
}

// Small monotonic id generator shared across the platform (events, templates,
// graphics, quotes). Prefix keeps ids readable in stored state.
let seq = 0
export const uid = (prefix: string): string =>
  `${prefix}_${(seq++).toString(36)}_${Math.random().toString(36).slice(2, 7)}`

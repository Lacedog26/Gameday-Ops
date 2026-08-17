// @gamedayops/core — the shared, sport-agnostic GameDayOps platform.
// Types + engine + product registry + the full application shell. Consumed by
// every product app (NFL, College Football, …); a fix here improves all.
export * from './types'
export * from './lib/time'
export * from './components/dashboard/alertStyles'
export * from './product'
export * from './schedule'
export * from './billing'
export * from './brand'
export { uid } from './lib/id'
export { GameDayOpsRoot } from './Root'

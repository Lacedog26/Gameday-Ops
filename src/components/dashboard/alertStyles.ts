import type { AlertLevel } from '../../types'

// Maps an alert level to the row's visual treatment. `cb` (colorblind) swaps to
// a blue/orange-safe palette and leans on iconography + text, not hue alone.

export interface RowStyle {
  /** Container classes for the whole row. */
  row: string
  /** Classes for the countdown cell. */
  timer: string
  /** Status pill label + classes. */
  statusLabel: string
  statusPill: string
}

export function rowStyle(level: AlertLevel, cb: boolean): RowStyle {
  switch (level) {
    case 'completed':
      return {
        row: 'bg-gradient-to-r from-navy-900/80 to-navy-950/70 text-slate-500 border-white/5',
        timer: 'text-slate-600 line-through decoration-slate-600/60',
        statusLabel: 'DONE',
        statusPill: 'bg-alert-go/15 text-alert-go border border-alert-go/30',
      }
    case 'upcoming':
      return {
        row: 'bg-gradient-to-r from-navy-700/60 via-navy-800/70 to-navy-850/70 text-white border-sky-300/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-sky-300/25',
        timer: 'text-sky-300',
        statusLabel: 'READY',
        statusPill: 'bg-bills-royal/30 text-sky-100 border border-sky-300/30',
      }
    case 'warn':
      return {
        row: cb
          ? 'bg-gradient-to-r from-amber-300 to-amber-400 text-navy-950 border-amber-200 shadow-glow-yellow animate-pulse-soft'
          : 'bg-gradient-to-r from-yellow-300 via-alert-warn to-amber-400 text-navy-950 border-yellow-100 shadow-glow-yellow animate-pulse-soft',
        timer: 'text-navy-950',
        statusLabel: 'STANDBY',
        statusPill: 'bg-navy-950/25 text-navy-950 border border-navy-950/40',
      }
    case 'imminent':
      return {
        row: 'text-white border-red-300/70 animate-flash-red shadow-glow-red',
        timer: 'text-white',
        statusLabel: 'ON DECK',
        statusPill: 'bg-white text-bills-red border border-white',
      }
    case 'critical':
      return {
        row: 'text-white border-red-200 animate-flash-red-fast shadow-glow-red',
        timer: 'text-white',
        statusLabel: 'ON DECK',
        statusPill: 'bg-white text-bills-red border border-white',
      }
    case 'go':
      return {
        row: 'text-white border-emerald-200 animate-flash-go',
        timer: 'text-white',
        statusLabel: 'GO NOW',
        statusPill: 'bg-white text-emerald-700 border border-white',
      }
  }
}

/** Short human status text (also used by the focus panel / progress rail). */
export function levelLabel(level: AlertLevel): string {
  switch (level) {
    case 'completed':
      return 'COMPLETE'
    case 'upcoming':
      return 'READY'
    case 'warn':
      return '5 MIN'
    case 'imminent':
      return 'ON DECK'
    case 'critical':
      return 'ON DECK'
    case 'go':
      return 'GO NOW'
  }
}

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
        row: 'bg-gradient-to-r from-emerald-900/35 to-navy-800/50 text-slate-400 border-emerald-400/15',
        timer: 'text-slate-500 line-through decoration-slate-500/60',
        statusLabel: 'DONE',
        statusPill: 'bg-alert-go/20 text-emerald-300 border border-alert-go/40',
      }
    case 'upcoming':
      return {
        row: 'bg-gradient-to-r from-[#1b47a6]/70 via-[#173b8c]/70 to-[#12306e]/65 text-white border-sky-300/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:border-sky-300/45',
        timer: 'text-cyan-300',
        statusLabel: 'READY',
        statusPill: 'bg-sky-400/25 text-white border border-sky-300/50',
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

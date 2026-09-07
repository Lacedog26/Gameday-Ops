import type { AlertLevel, OpStatus } from '../../types'

// Row treatment is a blend of WHERE the event sits in the sequence (opStatus:
// now / ondeck / upcoming / complete) and HOW close it is in time (alert level).
// Visual hierarchy:
//   NOW      -> green flash "GO" (highest attention, action happening)
//   ON DECK  -> blue highlight; escalates to yellow (5m) then red (2m/30s)
//   UPCOMING -> subdued
//   COMPLETE -> dimmed + green check

export interface RowStyle {
  row: string
  timer: string
  statusLabel: string
  statusPill: string
}

export function rowStyle(op: OpStatus, level: AlertLevel, cb: boolean): RowStyle {
  // Completed — dimmed, out of the way.
  if (op === 'complete') {
    return {
      row: 'bg-gradient-to-r from-navy-900/70 to-navy-950/60 text-slate-500 border-white/5 opacity-70',
      timer: 'text-slate-600 line-through decoration-slate-600/60',
      statusLabel: 'COMPLETE',
      statusPill: 'bg-alert-go/15 text-alert-go border border-alert-go/30',
    }
  }

  // NOW — the event is at/just past its scheduled time.
  if (op === 'now') {
    return {
      row: 'text-white border-emerald-200 animate-flash-go shadow-glow-red',
      timer: 'text-white',
      statusLabel: 'NOW',
      statusPill: 'bg-white text-emerald-700 border border-white',
    }
  }

  // ON DECK — the next group to go. Escalates with time.
  if (op === 'ondeck') {
    if (level === 'critical') {
      return {
        row: 'text-white border-redbright animate-flash-red-fast shadow-glow-red',
        timer: 'text-white',
        statusLabel: 'ON DECK',
        statusPill: 'bg-white text-redbright border border-white',
      }
    }
    if (level === 'imminent') {
      return {
        row: 'text-white border-redbright animate-flash-red shadow-glow-red',
        timer: 'text-white',
        statusLabel: 'ON DECK',
        statusPill: 'bg-white text-redbright border border-white',
      }
    }
    if (level === 'warn') {
      return {
        row: cb
          ? 'bg-white text-navy-950 border-amber-300 ring-2 ring-amber-300 shadow-[0_0_26px_rgba(255,255,255,0.35)]'
          : 'bg-white text-navy-950 border-white shadow-[0_0_30px_rgba(255,255,255,0.4)]',
        timer: 'text-redbright',
        statusLabel: 'ON DECK',
        statusPill: 'bg-navy-900 text-white border border-navy-900',
      }
    }
    // Calm on-deck: strong BLUE highlight + subtle pulse (get ready, you're next).
    return {
      row: 'bg-gradient-to-r from-team-primary-light via-team-primary to-team-primary/80 text-white border-2 border-white/50 ring-1 ring-white/25 shadow-glow-blue animate-pulse-soft',
      timer: 'text-cyan-200',
      statusLabel: 'ON DECK',
      statusPill: 'bg-white/20 text-white border border-white/60',
    }
  }

  // UPCOMING — subdued, low prominence.
  return {
    row: 'bg-navy-900/45 text-slate-300 border-white/5',
    timer: 'text-slate-400',
    statusLabel: 'UPCOMING',
    statusPill: 'bg-white/5 text-slate-400 border border-white/10',
  }
}

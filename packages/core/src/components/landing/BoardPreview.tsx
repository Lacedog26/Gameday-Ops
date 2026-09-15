// A static, self-contained preview of the live operator board, drawn in the
// product's own visual language (not a stock photo, no external image). Used on
// the marketing page so visitors see the actual UI before signing up. Content is
// illustrative and neutral (no real team branding).

const ROWS: { clock: string; t: string; label: string; status: 'DONE' | 'NOW' | 'ON DECK' | '' }[] = [
  { clock: '11:22', t: 'T-38:00', label: 'INDIVIDUAL', status: 'DONE' },
  { clock: '11:27', t: 'T-33:00', label: 'SEVEN ON SEVEN', status: 'DONE' },
  { clock: '11:32', t: 'T-28:00', label: 'TEAM', status: 'NOW' },
  { clock: '11:36', t: 'T-24:00', label: 'LEAVE FIELD', status: 'ON DECK' },
  { clock: '11:48', t: 'T-12:00', label: 'ANTHEM', status: '' },
  { clock: '12:00', t: 'T-0', label: 'KICKOFF', status: '' },
]

export default function BoardPreview() {
  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/12 bg-[#070b16] shadow-2xl shadow-black/40 ring-1 ring-white/5">
      {/* Board header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#0a1120] px-5 py-4">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Week 6 · Home</div>
          <div className="truncate font-display text-2xl font-extrabold uppercase tracking-tight text-white sm:text-3xl">
            Wildcats <span className="text-slate-500">vs</span> Tigers
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300">Kickoff In</div>
          <div className="tnum font-mono text-3xl font-extrabold leading-none text-white sm:text-4xl">00:28:00</div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[1.4fr_1fr]">
        {/* Schedule table */}
        <div className="flex flex-col gap-1.5">
          {ROWS.map((r) => {
            const tone =
              r.status === 'NOW'
                ? 'border-emerald-400/50 bg-emerald-500/10'
                : r.status === 'ON DECK'
                  ? 'border-white/15 bg-white/[0.05]'
                  : r.status === 'DONE'
                    ? 'border-white/5 bg-white/[0.02] opacity-55'
                    : 'border-white/10 bg-white/[0.03]'
            return (
              <div key={r.label} className={`grid grid-cols-[62px_74px_1fr_auto] items-center gap-2 rounded-lg border px-3 py-2 ${tone}`}>
                <span className="tnum font-mono text-sm font-bold text-slate-300">{r.clock}</span>
                <span className="font-display text-xs font-bold tracking-wide text-slate-400">{r.t}</span>
                <span className={`truncate font-display text-sm font-extrabold uppercase tracking-tight ${r.status === 'DONE' ? 'text-slate-500 line-through' : 'text-white'}`}>
                  {r.label}
                </span>
                {r.status === 'NOW' ? (
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black tracking-widest text-navy-950">NOW</span>
                ) : r.status === 'ON DECK' ? (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-black tracking-widest text-white">ON DECK</span>
                ) : r.status === 'DONE' ? (
                  <span className="text-[10px] font-bold tracking-widest text-emerald-400/70">✓</span>
                ) : (
                  <span className="text-[10px] font-bold tracking-widest text-slate-600">—</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Focus + culture */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-200/80">Now</div>
            <div className="mt-1 font-display text-2xl font-black uppercase leading-none text-white">Team</div>
            <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-200/80">Goes Out In</div>
            <div className="tnum font-mono text-4xl font-black leading-none text-white">02:14</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Next</div>
            <div className="mt-1 font-display text-lg font-black uppercase leading-none text-white">Leave Field</div>
          </div>
          <div className="grid flex-1 place-items-center rounded-xl border border-white/10 bg-[radial-gradient(80%_80%_at_50%_20%,rgba(16,185,129,0.15),transparent)] p-4 text-center">
            <div className="font-display text-lg font-black uppercase tracking-wide text-white">Protect This House</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** A compact preview of the pre-game timeline editor (real admin UI language). */
export function TimelinePreview() {
  const rows = [
    { t: 'T-90:00', label: 'SPECIALISTS OUT' },
    { t: 'T-60:00', label: 'OFFENSE OUT' },
    { t: 'T-38:00', label: 'INDIVIDUAL' },
    { t: 'T-33:00', label: 'SEVEN ON SEVEN' },
    { t: 'T-0', label: 'KICKOFF' },
  ]
  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#070b16] shadow-xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0a1120] px-4 py-3">
        <span className="font-display text-sm font-extrabold uppercase tracking-wide text-white">Pre-Game Timeline</span>
        <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-navy-950">Save changes</span>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Anchor:
        {['T-77', 'T-79', 'T-80'].map((a, i) => (
          <span key={a} className={`rounded px-2 py-0.5 ${i === 1 ? 'bg-emerald-500 text-navy-950' : 'bg-white/10 text-slate-300'}`}>{a}</span>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[16px_78px_1fr] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-slate-600">⋮⋮</span>
            <span className="font-display text-xs font-bold tracking-wide text-emerald-300">{r.t}</span>
            <span className="truncate font-display text-sm font-extrabold uppercase tracking-tight text-white">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** A compact preview of the schedule / game setup (real admin UI language). */
export function SchedulePreview() {
  const games = [
    { wk: 'Week 1', date: 'Sat, Sep 5', opp: 'vs Ohio State', time: 'TBD' },
    { wk: 'Week 6', date: 'Sat, Oct 10', opp: 'at Oklahoma', time: '6:30 PM' },
    { wk: 'Rivalry', date: 'Sat, Nov 28', opp: 'at Texas A&M', time: 'TBD' },
  ]
  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#070b16] shadow-xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0a1120] px-4 py-3">
        <span className="font-display text-sm font-extrabold uppercase tracking-wide text-white">Schedule</span>
        <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-200">Import schedule</span>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        {games.map((g, i) => (
          <div key={g.wk} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 ${i === 0 ? 'border-emerald-400/40 bg-emerald-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
            <span className="w-16 shrink-0 font-display text-xs font-bold text-slate-300">{g.wk}</span>
            <span className="w-24 shrink-0 text-xs font-semibold text-slate-300">{g.date}</span>
            <span className="min-w-[120px] flex-1 font-display text-sm font-bold text-white">{g.opp}</span>
            <span className="tnum font-mono text-xs font-bold text-sky-300">{g.time}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">{i === 0 ? 'Loaded' : 'Load'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

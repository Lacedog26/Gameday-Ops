# Buffalo Bills — Pre-Game Operations Dashboard

A live, TV-ready operations dashboard that replaces printed pre-game routine
cards. It shows a full-screen, broadcast-quality countdown board that tells
every group in the building — coaches, equipment, athletic training, video,
operations, player engagement, personnel — exactly **who goes to the field
now, who's next, how long until the next event, and what's already done** —
with alerts that escalate from calm to impossible-to-miss as each event
approaches, all anchored to a single live countdown to kickoff.

Built with **React + TypeScript + Vite + Tailwind CSS + Framer Motion**.
State persists to **localStorage** today and is structured to migrate to
**Supabase or Firebase** by swapping one adapter.

> **Also in this repo:** [**Training & Anatomy**](TRAINING_ANATOMY.md) — a
> local-first 3D exercise and human-anatomy reference at `/#/train`, with an
> interactive muscle map, a 67-exercise library, combinable search and filters,
> and a workout builder. Fully additive: the board and admin console are
> unchanged, and the module is lazy-loaded so the TV view pays nothing for it.

---

## Table of contents

1. [Features](#features)
2. [Screens & wireframes](#screens--wireframes)
3. [Folder structure](#folder-structure)
4. [Running locally](#running-locally)
5. [Deploying on TVs (kiosk mode)](#deploying-on-tvs-kiosk-mode)
6. [Architecture & state management](#architecture--state-management)
7. [Data models](#data-models)
8. [The timing model](#the-timing-model)
9. [Migrating to Supabase / Firebase](#migrating-to-supabase--firebase)
10. [Keyboard shortcuts](#keyboard-shortcuts)

---

## Features

**The board (`/`)**
- Giant live **countdown to kickoff**, updating every second.
- Header with opponent, week, kickoff time, and current local time.
- **Full chronological schedule** — clock time, T-minus, event, status, live countdown per row.
- **Escalating alert system** driven entirely by time:
  - `> 5 min` — calm dark row, blue accents.
  - `≤ 5 min` — row turns **yellow**, soft pulse, enlarged countdown (`STANDBY`).
  - `≤ 2 min` — row **flashes red**, glowing border, `ON DECK` indicator, optional alert tone.
  - `≤ 30 sec` — faster flash, larger timer (`critical`).
  - `at/after scheduled time` — **`GO NOW`** (flashes until 1 minute passes **or** staff acknowledge).
  - **completed** — dark gray, green check, strike-through, dimmed.
- **Current Focus panel** — big always-on `NOW` / `NEXT` cards with "GOES OUT IN" countdown → `GO NOW`.
- **Vertical progress rail** — green (done) / red (current) / Bills-blue (upcoming) + % complete.
- **Team Culture panel** — auto-rotating motivational graphics (fade/slide), transparency preserved,
  never distorted. Automatically **shrinks/dims out of the way** during a 2-minute or GO NOW alert,
  then resumes.
- **TV mode niceties** — fixed 1920×1080 stage auto-scaled to any screen (no scrolling, no per-TV
  tuning), wake-lock to prevent sleep, auto-hiding controls, cross-TV sync, synthesized alert tones,
  browser notifications, colorblind-friendly palette, fullscreen/kiosk.

**The admin console (`/#/admin`)** — mobile-friendly
- Set kickoff time, opponent, week, home/away.
- Add / edit / delete / reorder events; edit T-minus values (accepts `77` or `35:30`).
- Save / load / update / delete **schedule templates** (Regular, Preseason, Primetime/Playoffs presets included).
- Upload culture graphics (PNG/GIF/SVG/JPG/WEBP → stored as data URLs, no re-encoding), enable/disable,
  reorder, set per-graphic duration.
- Add **text motivational quotes** (type your own) that rotate in the culture panel alongside the
  graphics — editable text, optional attribution, accent color (blue/red/white), enable/disable, reorder.
- Settings: sound, volume, colorblind mode, rotation interval, transition style, keep-awake, weather.
- Export / import full config as JSON; reset to defaults.

Everything the admin changes **syncs live to every open board** on the same machine/network origin via
storage events — no refresh needed.

---

## Screens & wireframes

### Main dashboard (1920×1080, scaled to fit any TV)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ⬤ BUFFALO BILLS            ┌ MATCHUP ┬ WEEK ┬ KICKOFF ┬ LOCAL ┐        KICKOFF IN      │
│   PRE-GAME OPERATIONS      │ vs Jets │ Wk 1 │ 1:00 PM │ 11:41 │        00:58:14        │
│ ───────────────────────────────────────────────────────────────────(red underline)────│
│  %  │ CLOCK │ T-MIN │ EVENT                 │ STATUS  │ COUNTDOWN │  ┌─────────────────┐ │
│  ●  │ 11:45 │ T-77  │ K, P, LS OUT   ▉yellow│ STANDBY │   02:12   │  │      NOW        │ │
│  ●  │ 12:00 │ T-62  │ RETURNERS OUT         │ READY   │   17:12   │  │  K, P, LS OUT   │ │
│  ●  │ 12:12 │ T-50  │ DB OUT                │ READY   │   29:12   │  │  GOES OUT IN    │ │
│  ●  │ 12:12 │ T-50  │ QB, C, TE, WR, RB OUT │ READY   │   29:12   │  │     02:12       │ │
│  ●  │ 12:15 │ T-47  │ PAT & GO              │ READY   │   32:12   │  ├─────────────────┤ │
│  ●  │  ...  │  ...  │  ...                  │  ...    │    ...    │  │ NEXT  RETURNERS │ │
│ (progress rail: green=done, red=now, blue=upcoming)               │  ├─────────────────┤ │
│                                                                    │  │  BILLS CULTURE  │ │
│                                                                    │  │  [rotating art] │ │
│                                                                    │  └─────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Admin console (responsive, scrollable)

```
┌ PRE-GAME OPERATIONS · ADMIN CONSOLE ───────────────────── [← BACK TO BOARD] ┐
│ ▍GAME SETUP        Opponent | Week | Home/Away | Kickoff (datetime)          │
│ ▍SCHEDULE TEMPLATES  [Regular][Preseason][Primetime]  · Save current as …    │
│ ▍SCHEDULE EDITOR   +Add · Sort · Reset acks   rows: Clock|T-|Label|Note|↕🗑  │
│ ▍TEAM CULTURE GRAPHICS  drag&drop · cards w/ ON/OFF, duration, reorder, 🗑    │
│ ▍DISPLAY & ALERT SETTINGS  sound · volume · colorblind · rotation · …         │
│ ▍BACKUP & RESET  export / import / reset                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Folder structure

```
bills-pregame-dashboard/
├── index.html                 # Vite entry; loads broadcast fonts (graceful offline fallback)
├── vite.config.ts             # base:'./' so it runs from any path / kiosk
├── tailwind.config.js         # Bills palette, alert keyframes/animations, fonts
├── postcss.config.js
├── tsconfig*.json
├── public/
│   ├── favicon.svg
│   └── culture/               # default culture graphics (transparent SVG)
│       ├── they-have-to-play-us.svg
│       ├── put-the-ball-down.svg
│       └── bills-mafia.svg
└── src/
    ├── main.tsx               # Router (HashRouter) + provider mount
    ├── App.tsx                # Root layout / <Outlet/>
    ├── index.css              # Tailwind + global TV styles
    ├── types/
    │   └── index.ts           # All data models + derived types
    ├── lib/
    │   ├── time.ts            # Formatting, alert-level logic, timeline builder
    │   ├── storage.ts         # StorageAdapter interface + LocalStorageAdapter
    │   └── defaults.ts        # Preset templates, culture graphics, first-run state
    ├── context/
    │   └── DashboardContext.tsx  # useReducer store + persistence + cross-tab sync
    ├── hooks/
    │   ├── useNow.ts          # Aligned 1s ticker
    │   ├── useTimeline.ts     # Selector: schedule + now -> derived board state
    │   ├── useAlertSounds.ts  # WebAudio escalation tones
    │   ├── useWakeLock.ts     # Screen Wake Lock for TVs
    │   ├── useFullscreen.ts   # Fullscreen/kiosk helper
    │   └── useKeyboardShortcuts.ts
    └── components/
        ├── common/
        │   ├── FitScreen.tsx  # 1920×1080 stage auto-scaled to viewport
        │   └── BillsMark.tsx  # Original team-style roundel (not the trademark)
        ├── dashboard/
        │   ├── Dashboard.tsx      # Composition + all live wiring
        │   ├── Header.tsx
        │   ├── ScheduleTable.tsx
        │   ├── ScheduleRow.tsx
        │   ├── FocusPanel.tsx
        │   ├── ProgressRail.tsx
        │   ├── CulturePanel.tsx
        │   ├── ControlBar.tsx
        │   └── alertStyles.ts     # Level -> row styling (incl. colorblind)
        └── admin/
            ├── AdminPage.tsx
            ├── ui.tsx             # Shared form primitives
            ├── GameSetupSection.tsx
            ├── TemplatesSection.tsx
            ├── ScheduleEditorSection.tsx
            ├── GraphicsSection.tsx
            ├── SettingsSection.tsx
            └── DangerSection.tsx
```

---

## Running locally

Requires Node 18+.

```bash
cd bills-pregame-dashboard
npm install
npm run dev          # http://localhost:5173  (use --host to reach it from a TV)
```

- The board is at `/` (i.e. `http://localhost:5173/#/`).
- The admin console is at `/#/admin`.

Production build & local preview:

```bash
npm run build        # type-checks then bundles to dist/
npm run preview      # serves the built app on http://localhost:4173
npm run typecheck    # type-check only
```

`dist/` is a fully static bundle — host it on any static server (Nginx, Netlify,
Vercel, S3, a shared drive, or a Raspberry Pi on the LAN).

---

## Deploying on TVs (kiosk mode)

The app is a static SPA that auto-scales to any 16:9 panel, keeps the screen
awake, and auto-recovers after connection loss (it always renders from local
state and re-syncs when storage/network returns).

**Recommended: Chrome/Chromium kiosk on a mini-PC or Raspberry Pi per TV.**

1. Build once and host `dist/` somewhere the TVs can reach (LAN box or cloud).
2. On each TV's player, launch Chrome in kiosk mode pointed at the board URL:

   ```bash
   chrome \
     --kiosk \
     --incognito \
     --noerrdialogs \
     --disable-session-crashed-bubble \
     --disable-infobars \
     --autoplay-policy=no-user-gesture-required \
     --app=https://YOUR_HOST/#/
   ```

   On Raspberry Pi OS use `chromium-browser` with the same flags.

3. **Arm the audio** (browsers block sound until one interaction): click the
   screen once or press any key on the kiosk after it loads. Alert tones then
   work for the whole session. Sound can also be toggled with **S** or in admin.
4. Set the player to auto-launch on boot (a `~/.config/autostart/*.desktop`
   entry or systemd unit) and disable OS screen blanking. The app's wake-lock
   handles display sleep on supported browsers as a second layer.

**Auto-refresh / resilience**
- The board never depends on the network to keep counting — timing is local.
- To pick up new deploys automatically, add a nightly reload (e.g. an OS cron
  that restarts the kiosk during off-hours), or drop a small meta-refresh in
  front of the app. Config changes made in admin propagate to every board on
  the same origin instantly via storage events.

**Multiple TVs stay in sync** when they share the same origin/localStorage
(same machine, multiple windows) out of the box. For building-wide sync across
separate players, point them all at a Supabase/Firebase backend — see below.

---

## Architecture & state management

- **Single source of truth**: one `AppState` document in a `useReducer` store
  (`DashboardContext`). Components read via the `useDashboard()` hook and mutate
  through typed `actions` — never by touching storage directly.
- **Persistence is an interface**, not a hard dependency. `StorageAdapter`
  (`src/lib/storage.ts`) defines `load / save / subscribe`. The shipped
  `LocalStorageAdapter` persists to localStorage and broadcasts changes across
  tabs/windows via the `storage` event (that's how edits appear live on every
  board). Swapping backends = implementing this one interface.
- **Time is derived, never stored per-tick.** A single aligned 1-second ticker
  (`useNow`) feeds `useTimeline`, which turns the static schedule + "now" into
  fully-derived, memoized board state (each event's absolute time, seconds
  remaining, and alert level). Nothing is recomputed unless the schedule or the
  second changes.
- **Presentation vs. logic split.** All escalation thresholds live in
  `lib/time.ts` (`THRESHOLDS`, `computeLevel`); components only map a level to
  pixels (`alertStyles.ts`, `FocusPanel`, `CulturePanel`). Change the rules in
  one place.
- **Rendering** uses Framer Motion for row reordering (schedule re-sorts as time
  passes), focus-card transitions, culture cross-fades, and the alert pulses,
  with a `prefers-reduced-motion` fallback.

---

## Data models

Full definitions in [`src/types/index.ts`](src/types/index.ts). Summary:

```ts
PregameEvent {
  id: string
  label: string            // "K, P, LS OUT"
  note?: string
  tMinusSeconds: number     // seconds BEFORE kickoff (the source of truth)
  acknowledgedAt?: number | null
  isKickoff?: boolean
}

ScheduleTemplate {
  id, name, kind, description?, builtIn?, updatedAt
  events: PregameEvent[]
}   // kind: 'regular'|'preseason'|'playoffs'|'primetime'|'international'|'custom'

GameInfo    { opponent, week, kickoffISO, homeAway }
CultureGraphic { id, name, src, enabled, order, durationSec? }
Settings    { soundEnabled, volume, colorblindMode, cultureRotationSec,
              cultureTransition, showWeather, keepAwake }

AppState    { version, game, activeEvents, templates, graphics, settings }
```

Derived at runtime (not persisted): `AlertLevel`
(`upcoming → warn → imminent → critical → go → completed`) and `TimedEvent`
(an event enriched with `scheduledAt`, `secondsUntil`, and `level`).

---

## The timing model

The **entire board is driven by one timestamp — kickoff.** Every event stores
only `tMinusSeconds` (how many seconds before kickoff it happens). From that:

```
scheduledAt  = kickoff − tMinusSeconds
secondsUntil = scheduledAt − now
level        = computeLevel(secondsUntil, acknowledged)
```

So staff **never calculate timing by hand** — change the kickoff time in admin
and every clock, countdown, and alert recomputes instantly. T-minus values
accept `mm` or `mm:ss` (e.g. `35:30`) exactly like the printed card.

---

## Migrating to Supabase / Firebase

No component changes required — implement the adapter and change one line.

```ts
// src/lib/storage.ts
export class SupabaseAdapter implements StorageAdapter {
  async load()  { /* select the config row */ }
  async save(s) { /* upsert the config row */ }
  subscribe(fn) { /* realtime channel -> fn(newState); return unsubscribe */ }
}

// then:
export const storage: StorageAdapter = new SupabaseAdapter(client)
```

`subscribe` is already how live sync works locally, so a realtime backend makes
**every TV in the building** update the instant anyone edits the schedule.
Culture graphics currently ride inside the config as data URLs; when moving to a
backend, upload them to storage (Supabase Storage / Firebase Storage) and keep
public URLs in `CultureGraphic.src` — the panel already handles any URL.

---

## Keyboard shortcuts

On the board:

| Key | Action |
|-----|--------|
| `F` | Toggle fullscreen (kiosk) |
| `S` | Toggle alert sounds |
| `C` | Toggle colorblind-friendly alerts |
| `Space` / `Enter` | Acknowledge the current **GO NOW** |

---

### Note on branding assets

The **"They Have To Play Us"** and **"Put The Ball Down"** graphics in
`public/culture/` are the team's own transparent PNGs (trimmed to the artwork
bounds; "Put The Ball Down" uses a white plaque backdrop since its artwork is
drawn for a light background — toggle per graphic in admin via the
`WHITE BG` / `CLEAR BG` button). The header mark and the "Bills Mafia" slide are
original, team-styled placeholders, not official trademarked artwork. Upload
more transparent PNGs/GIFs through **Admin → Team Culture Graphics**;
transparency and original artwork are preserved exactly (never distorted).
```

Bills palette used throughout: Royal `#00338D`, Red `#C60C30`, White, dark navy backgrounds.

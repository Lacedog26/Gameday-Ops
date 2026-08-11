# Architecture — Pre-Game Operations Platform

This document explains the current architecture, the target commercial
architecture, and the phased path between them.

---

## 1. What exists today (and works well — preserved)

The live app is a **React + TypeScript + Vite + Tailwind + Framer Motion**
single-page app deployed on Vercel. These pieces are solid and were kept:

- **Kickoff-driven timing engine** (`src/lib/time.ts`) — the whole board is
  derived from one kickoff timestamp + each event's `tMinusSeconds`. Change
  kickoff → every clock, countdown, and alert recomputes. This is the core IP
  and is unchanged.
- **Alert escalation** — calm → white "standby" (5 min) → flashing red "ON DECK"
  (2 min) → 30-second critical → GO NOW → completed. Countdown beeps (10s, then
  5-4-3-2-1 with a loud final beep) and a GO horn.
- **Focus panel (NOW / NEXT), progress rail, culture panel** (rotating graphics
  + text quotes that yield to alerts), **TV auto-scale** (fixed 1920×1080 stage
  scaled to any screen), wake-lock, fullscreen, keyboard shortcuts.
- **Eastern-time handling** — all wall clocks render in ET regardless of device.
- **Storage behind an interface** (`src/lib/storage.ts`, `StorageAdapter`) —
  the app never touches localStorage directly, which is what makes the Supabase
  swap a single-file change.

## 2. What changed in this phase (multi-team / white-label)

- **`src/data/nflTeams.ts`** — all 32 clubs as configurable brand data
  (identity, conference/division, colors, empty asset-URL fields). No logos are
  bundled.
- **Theme engine** (`src/context/ThemeProvider.tsx` + CSS variables in
  `index.css`) — the active team's colors are written to CSS variables on
  `<html>`; Tailwind's `team-*` / `bills-*` tokens resolve to those variables,
  so the entire board (background, header, rows, focus panel, progress, logo
  mark) re-themes when a team is selected. **No component hard-codes a team
  color.** Alert red is intentionally *not* themed so urgency reads identically
  on every team.
- **Team + opponent selection** in the admin Game Setup, grouped by division.
- Data model gained `TeamBrand`, `Organization`, and `game.teamId/opponentId`.

## 3. Target commercial architecture

```
Organization (tenant)
  └── Members (admin / operator / viewer)
  └── Team (one of 32, + brand overrides & uploaded assets)
  └── Schedules (templates)  ── Schedule Events
  └── Games (live)  ── runs a Schedule, has a kickoff instant, Acks
  └── Displays (registered TVs, each with a token + assigned game)
  └── Culture Graphics / Quotes / Alert Settings
```

- **Frontend:** unchanged stack (React/TS/Vite/Tailwind/Framer) on Vercel.
- **Backend:** Supabase — **Postgres** (data), **Auth** (users/roles),
  **Storage** (logos + culture graphics), **Realtime** (multi-TV sync).
- **Multi-tenancy:** every tenant row carries `org_id`; **Row-Level Security**
  (see `supabase/migrations/0001_init.sql`) guarantees one customer can never
  read another's data. Enforced in the database, not just the UI.
- **Time authority:** games store `kickoff_at` as an absolute UTC instant.
  Clients render it in the game's timezone. Countdowns can be anchored to the
  server clock (Supabase `now()`) to avoid trusting a TV's local clock.

## 4. Real-time multi-TV sync

- Admin edits write to Postgres. The `games`, `schedules`, `schedule_events`,
  and `game_acks` tables are in the `supabase_realtime` publication.
- Each TV opens `#/display/:displayId`, subscribes to its assigned game, and
  re-renders on any change — schedule edits, kickoff changes, and GO
  acknowledgements propagate to **every** screen within a second.
- The `StorageAdapter.subscribe()` method already models this; the
  `SupabaseAdapter` (Phase 2) implements it with a realtime channel. Today the
  `LocalStorageAdapter` does the same across tabs on one machine via the
  `storage` event — so the sync architecture is already proven, just local.

## 5. Reliability (game-day hardening)

- **Local-first render:** the board always renders from cached state and keeps
  counting even if the network drops (timing is local math). A visible
  `● CONNECTED / ● OFFLINE` indicator shows link status.
- **Auto-recovery:** on reconnect/refresh the display re-fetches its game and
  resumes the correct state; the display token means a TV needs no login.
- **Caching:** schedule + game are cached (localStorage / service worker) so a
  cold TV boot shows the last known board immediately, then reconciles.

## 6. Phased roadmap

| Phase | Scope | Needs from you |
|------|-------|----------------|
| **1 — done** | 32 teams, white-label theming, team/opponent selection, DB schema + docs | — |
| **2 — backend** | Supabase project, run migrations, `SupabaseAdapter`, auth (admin/operator/viewer), org bootstrap | A Supabase project (URL + keys) |
| **3 — displays & sync** | Display registration, `#/display/:id` kiosk route, realtime fan-out, connection indicator | — |
| **4 — assets & polish** | Team Brand Assets uploads (logos/wordmarks), per-org culture library, audit log UI | Licensed logo files |
| **5 — commercial** | Org sign-up, roles UI, usage limits, billing hooks (Stripe) | Business decisions |

## 7. Why this is safe to sell

- Tenant isolation is enforced in Postgres (RLS), the strongest layer.
- No third-party trademarked artwork is embedded; logos are customer-supplied.
- The timing engine — the actual product value — is unchanged and battle-tested.
- The same build serves every customer; a new club is **data**, not a code fork.

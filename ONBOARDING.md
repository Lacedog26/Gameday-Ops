# Onboarding & Operations Guide

How a new organization, team, display, and schedule are set up — and how the
product becomes commercial. Phase 1 (multi-team theming) works today with no
backend. Phases marked **(Phase 2+)** require the Supabase backend to be live.

---

## Today (no backend needed)

1. Open the board URL. The admin console is at `.../#/admin`.
2. **Game Setup:** pick your **Team** (themes the whole board), pick the
   **Opponent**, set **Week**, **Home/Away**, and **Kickoff (Eastern)**.
3. **Schedule Editor:** the Bills routine loads by default (matches the printed
   card). Add/edit/reorder events and T-minus times, or load a template.
4. **Team Culture:** upload PNG/JPG graphics and type motivational quotes.
5. **Settings:** sound, volume, colorblind mode, rotation, GO duration.

Everything is kickoff-driven: change the kickoff and every clock recalculates.

---

## Onboarding a new organization (Phase 2+)

1. Admin creates the organization (name) and selects its **Team**.
2. Supabase Auth issues logins; the creator becomes **admin**. Add teammates as
   **operator** (run game day) or **viewer**.
3. RLS scopes everything to that org automatically — they only ever see their
   own schedules, games, displays, and assets.

## Configuring a team's branding

- Colors come preloaded for all 32 clubs and theme the board instantly.
- To use official marks, an admin uploads them under **Team Brand Assets**
  (primary logo, secondary logo, wordmark, background). Uploaded logos replace
  the generic themed mark. Overrides live per-org, so updating a color or logo
  never touches application code.

## Registering displays (TVs) (Phase 3)

1. Admin → **Displays** → **Add Display**: name it (e.g. "Display 01") and set a
   location ("Turf Area").
2. Each display gets a unique token and a URL: `.../#/display/<id>`.
3. On the TV, open that URL and go fullscreen (kiosk). It shows only the board —
   no admin controls — and auto-reconnects/recovers on its own.
4. Assign which **game** a display shows (usually the active game). All displays
   on the active game stay in lockstep.

## Creating and assigning schedules

- Build a schedule once in the editor, **Save as Template** (Regular Season,
  Preseason, Primetime, etc.). Templates are per-org and not shared across
  tenants.
- On game day, create a **Game**, pick its **Schedule**, set kickoff — done.
- **Delays:** if kickoff moves (1:00 → 1:15), change the kickoff once. Every
  event recalculates and (Phase 3) every TV updates within a second.

## Game-day control

- The admin **Game Day** view shows current event, next event, kickoff
  countdown, connected displays, and alert status at a glance, with one-tap
  kickoff changes and event acknowledgement — usable from a phone.

---

## Commercialization path

- **Packaging:** one Vercel deployment serves all tenants; a new club is a row,
  not a fork.
- **Plans:** gate by org — number of displays, users, and saved schedules
  (fields already exist to meter). Add Stripe later via a `subscriptions` table
  + webhook; the architecture reserves room without requiring it now.
- **White-label:** each customer logs in to *their* team, colors, logo,
  schedules, graphics, users, and displays on the identical codebase.
- **Trust:** database-enforced tenant isolation (RLS), customer-supplied logos
  (no trademark redistribution), and a proven, unchanged timing engine.

---

## Deploying on Vercel (recap)

- Root config builds the `bills-pregame-dashboard` app (see repo-root
  `vercel.json` and `bills-pregame-dashboard/vercel.json`).
- **Phase 2+ environment variables** (Vercel → Settings → Environment
  Variables):
  - `VITE_SUPABASE_URL` — your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` — the anon public key
- With those set, the app uses the Supabase backend (real auth, database,
  realtime sync). Without them, it runs in the current local-first mode — so the
  same build works before and after the backend is connected.

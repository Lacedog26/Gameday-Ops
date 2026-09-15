# GameDayOps College

Pre-game operations software for college football. GameDayOps turns a program's
game-day routine into one live, team-branded countdown that keeps every position
group, coach, and TV in the building on the same schedule — driven off a single
kickoff time.

**Production:** https://pregameopscfb.app

- **One source of truth.** Set the kickoff once; every event's clock time is
  calculated from it. Change the kickoff and the whole timeline recalculates.
- **T-minus routine.** Build a pre-game timeline to the second (e.g. `T-38:00
  INDIVIDUAL`), reorder events, add notes, and shift the whole routine by moving
  its anchor while relative spacing is preserved.
- **Live TV displays.** Open a secure display link on any facility TV; each
  screen stays in sync with the operator board — no login on the TV itself.
- **Team branding & culture.** Every FBS & FCS program is selectable; set your
  colors and logo and rotate your own culture graphics.
- **Schedule importer.** Major programs ship with a current-season schedule to
  start; import any team by screenshot, CSV, PDF, or paste. Unknown kickoffs stay
  **TBD** — the app never invents a time.

Built with **React + TypeScript + Vite + Tailwind CSS + Framer Motion**, with
**Supabase** (Auth, Postgres + row-level security, Edge Functions) and **Stripe**
for accounts and billing.

## Repository layout

This is an npm-workspaces monorepo. Shared UI/engine lives in one package and each
product injects its own team + schedule world.

```
packages/core     Shared UI, timeline engine, auth/billing, dashboard & admin
apps/college       GameDayOps College  → pregameopscfb.app  (this product)
apps/nfl           GameDayOps NFL       (separate deployment)
supabase/          SQL migrations + Edge Functions (checkout, portal, webhook)
```

The College data universe (teams, schedule, defaults) lives in
`apps/college/src/`; the shared engine never imports league data directly — each
app calls `configureProduct(...)` at startup.

## Running locally

```bash
npm install
npm run dev --workspace @gamedayops/college     # College app
```

Copy `apps/college/.env.example` to `.env` and set the Supabase project values.
`.env.production` contains only public-safe values (the Supabase URL and the
publishable anon key); no secrets are committed. Server-side secrets (Stripe and
the Supabase service-role key) live only in Edge Function config.

## The timing model

```
KICKOFF (authoritative game time)
   ↓
T-MINUS (authoritative routine timing, full-second precision)
   ↓
CALCULATED CLOCK TIME (derived — never stored)
```

Kickoff is the single source of truth. Each event stores only its `tMinusSeconds`;
the displayed clock time and countdown are always derived from `kickoff − tMinus`.

## Schedules

See `apps/college/SCHEDULE_IMPORT.md`. Real schedules can be generated from the
free CollegeFootballData API and imported in **Admin → Schedule Center**. Imported
games are the master schedule; any per-org edit is stored as an override and never
mutates the master.

## Deploying on TVs (kiosk)

In **Admin → Displays**, create a display and copy its link. Open the link on the
TV or computer, enter fullscreen (`F`), and leave it running. The display is
read-only and token-scoped — it shows only that organization's board.

### Keyboard shortcuts (on the board)

`F` fullscreen · `S` sound · `C` colorblind alerts · `Space` acknowledge GO NOW

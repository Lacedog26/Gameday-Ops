# Importing a Team's Schedule

Buffalo's 2026 season is preloaded with real, sourced data. Other teams start
empty — populate them by importing the official schedule as JSON in
**Admin → Schedule Center → Import Schedule (JSON)**. The app never fabricates
games; anything not imported shows as empty or TBD.

## JSON format

An array of game objects (or `{ "games": [ ... ] }`). One object per game:

```json
[
  {
    "id": "KC-2026-reg-1",
    "season": 2026,
    "teamId": "KC",
    "phase": "regular",
    "week": 1,
    "weekLabel": "Week 1",
    "date": "2026-09-13",
    "time": "16:25",
    "opponentId": "BUF",
    "homeAway": "HOME",
    "venue": "GEHA Field at Arrowhead Stadium",
    "network": "CBS",
    "status": "scheduled"
  }
]
```

Field notes:
- **id** — unique, stable. Convention: `TEAM-SEASON-phase-week` (`phase` = `pre` or `reg`).
- **teamId / opponentId** — the standard abbreviations (BUF, KC, PHI, …). See `src/data/nflTeams.ts`.
- **phase** — `"preseason"`, `"regular"`, or `"postseason"`.
- **date** — `YYYY-MM-DD` in Eastern; `""` if the date is TBD.
- **time** — 24-hour `HH:MM` in Eastern; `""` if the time is TBD.
- **homeAway** — `"HOME"` or `"AWAY"`.
- **status** — `scheduled` | `time_tbd` | `date_tbd` | `postponed` | `rescheduled` | `cancelled` | `completed` | `bye`.
- **venue / network** — optional.
- For a **bye**, set `status: "bye"` and omit opponent/date/time.

Importing replaces the custom games for each `(teamId, season)` present in the
file and leaves other teams untouched. The bundled master schedule is never
overwritten; per-game edits made in the UI are stored as separate overrides.

## Getting the data

Copy the official schedule from NFL.com (or an authorized feed) into this shape.
The architecture also anticipates CSV import and API-based refresh (see
`ARCHITECTURE.md`); JSON import is the first mechanism.

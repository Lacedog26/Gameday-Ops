# GameDayOps College — Schedule Import (CollegeFootballData)

Real FBS + FCS schedules load from the **free** CollegeFootballData (CFBD) API.
The app never invents games — unknown kickoffs import as **TBD** and stay editable.

## One-time setup

1. Get a **free** API key: https://collegefootballdata.com/key  (no cost)

## Import a season

```bash
# from the repo root
CFBD_KEY=your_key_here node apps/college/scripts/import-cfbd.mjs 2025
```

This writes `college-schedule-2025.json` (real FBS + FCS games — season + postseason,
per-team rows, ET kickoff times, TBD where unknown, venue, conference/non-conference).

## Load it into the app

Admin → **Schedule Center** → **Import Schedule (JSON)** → pick the generated file.
Games appear per team; the master schedule is populated.

## Editing (master vs. organization)

- Imported games are the **master schedule** (starting data, not locked).
- Any edit an org makes (date/time/opponent/venue/home-away/status/week) is stored as
  a per-game **override** — it never modifies the master.
- Changing kickoff **automatically recalculates** the entire pre-game timeline.

## Refreshing

Re-run the script any time (times firm up through the week) and re-import. The
Schedule Center shows a **Last Updated** stamp.

## Notes

- Team names are mapped to GameDayOps team ids using this app's own team file, so ids
  always stay in sync. Any opponent not in the database is kept as a text name.
- Postseason (conference championships, bowls, CFP, FCS playoffs) imports when CFBD
  has it; early-season postseason rows are typically TBD until matchups are set.

# Deploying the Bills Pre-Game Operations Dashboard

This app is a **static website** — no server or database required. You can run
it two ways, and you can use **both at the same time** (a cloud URL for
convenience, and a local machine as an on-site backup).

The build config is already in this folder:
- `netlify.toml` — Netlify settings
- `vercel.json` — Vercel settings

---

## Route A — Free cloud URL (Netlify or Vercel)

Rebuilds automatically every time changes are pushed to GitHub.

### Netlify
1. Sign in at **netlify.com** with your GitHub account.
2. **Add new site → Import an existing project →** choose the
   `Lacedog26/OneCompliment` repo.
3. Settings:
   - **Branch:** `claude/bills-pregame-dashboard-u38w0o` (or `main` once merged)
   - **Base directory:** `bills-pregame-dashboard`
   - Build command and publish dir come from `netlify.toml` automatically
     (`npm run build` → `dist`).
4. **Deploy.** You get a URL like `bills-pregame-ops.netlify.app`.

### Vercel
1. Sign in at **vercel.com** with GitHub.
2. **Add New → Project →** import `Lacedog26/OneCompliment`.
3. Set **Root Directory** to `bills-pregame-dashboard` (framework auto-detects
   as Vite from `vercel.json`).
4. **Deploy.** You get a URL like `bills-pregame-ops.vercel.app`.

**Open on the TVs:**
- Dashboard: the base URL
- Admin: the base URL + `/#/admin`

---

## Route B — Run on a machine in the building

Good as an on-site backup, or if you'd rather not use the cloud. Works on any
Mac / PC / mini-PC with Node 18+ installed.

```bash
cd bills-pregame-dashboard
npm install
npm run build
npm run preview -- --host
```

It prints a **Network URL** like `http://192.168.1.50:4173`. Any TV or device on
the same building network can open that address.

To keep it running after a reboot, set this command to launch on startup (a
Task Scheduler task on Windows, or a `launchd`/`pm2` service on Mac/Linux).

---

## Putting it on the TVs (kiosk mode)

On each TV's player (mini-PC, Fire Stick, or a smart-TV browser), open the URL
and go fullscreen. For a dedicated player running Chrome/Chromium:

```bash
chrome --kiosk --incognito --noerrdialogs \
  --disable-session-crashed-bubble --disable-infobars \
  --autoplay-policy=no-user-gesture-required \
  --app=https://YOUR_URL/#/
```

After it loads, **click once or press any key** so alert sounds are allowed for
the session. Disable the OS screen-saver; the app also uses a screen wake-lock.

---

## Notes

- **Each TV currently keeps its own schedule** (saved in that browser). Set the
  schedule per TV, or run the board from one machine.
- To make **all TVs sync from one admin edit**, add a Supabase/Firebase backend
  later — the app is already structured for it (see the README's
  "Migrating to Supabase / Firebase" section). It's a small follow-up.
- Times are shown in **US Eastern Time** regardless of the device's own clock.

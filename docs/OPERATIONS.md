# GameDayOps — Operations & Continuous Deployment

This is the day-to-day operations manual for running **two separate products**
out of one monorepo:

| Product | App folder | Production domain | Supabase project |
|---|---|---|---|
| GameDayOps **NFL** | `apps/nfl` | `pregameops.app` | *(NFL project — separate)* |
| GameDayOps **College** | `apps/college` | `pregameopscfb.app` | `wwpwjfrrywzmmbjintgp` |

The golden rule that everything below serves:

> **CODE is continuously replaceable. DATABASE / CUSTOMER DATA is permanent.
> DOMAINS are permanent.**
>
> Deploying new code must never touch customer data or change a production
> domain. NFL and College stay completely separate — separate domains,
> separate Supabase projects, separate Stripe accounts, separate schedules.
> They only share the open-source rendering engine in `packages/core`.

---

## 1. How a change reaches production (continuous deployment)

The pipeline is **push → Vercel builds → same URL updates**. No manual upload,
no downtime, no data migration for ordinary changes.

```
  you edit code  ─┐
                  ├─► git push origin <branch>
  (this repo)    ─┘            │
                               ▼
                    Vercel detects the push
                    (one Vercel project per app,
                     Root Directory = apps/nfl or apps/college)
                               │
                 ┌─────────────┴──────────────┐
                 ▼                             ▼
        push to PRODUCTION branch      push to any other branch / PR
        → Production deployment        → Preview deployment
        → pregameopscfb.app updates    → unique preview URL (safe to test)
```

- **One Vercel project per app.** Each has its **Root Directory** set to
  `apps/college` (or `apps/nfl`). Vercel runs `npm run build` there; the
  monorepo alias resolves `@gamedayops/core` from source, so there is no
  separate publish step for the shared engine.
- **Production branch.** Each Vercel project is configured with a Production
  Branch. A push to it redeploys the live domain **at the same URL** — viewers
  and TVs never change their address.
- **Preview branches.** Every other branch / PR gets its own throwaway preview
  URL. Test there first; the production domain is untouched until you merge.
- **The domain is attached to the Vercel project, not to a deployment.** New
  deployments swap in behind the domain; the domain itself is permanent. Never
  reassign a production domain while doing routine work.

### The routine change loop

```bash
# 1. branch off the production branch
git checkout -b fix/whatever

# 2. make the change, then verify locally BEFORE pushing
npm run build --workspace @gamedayops/college    # must exit 0
npm run build --workspace @gamedayops/nfl         # if core changed, build both

# 3. push — Vercel makes a preview URL automatically
git push -u origin fix/whatever

# 4. open the preview URL, confirm it looks right
# 5. merge to the production branch → live domain updates in ~1 minute
```

**Because `packages/core` is shared, a change there affects BOTH apps.** When
you touch core, build **both** apps locally before pushing, and eyeball both
preview URLs. App-only changes (`apps/college/**`) can't affect NFL.

---

## 2. What persists across deploys (and what doesn't)

A deploy replaces the **built code only**. Everything a customer created lives
in Supabase and is completely independent of deploys.

| Lives in… | Survives a deploy? | Examples |
|---|---|---|
| Git → Vercel build (the code) | ⟳ Replaced every deploy | components, schedules-as-defaults, styling |
| **Supabase Postgres** | ✅ Permanent | orgs, memberships, **per-org boards** (schedule, branding, quotes, templates), subscriptions |
| **Supabase Auth** | ✅ Permanent | user accounts, passwords, sessions |
| **Supabase Storage** | ✅ Permanent | uploaded team logos / graphics |
| Browser localStorage | Per-device | the anonymous/demo board only |

**Why customer data is safe:** each org's entire app state is one JSON row in
the `boards` table, keyed `org-<uuid>` and protected by Row-Level Security so an
org can only read/write its own row. The code that renders it is redeployed; the
row is never touched by a deploy. A signed-in operator's SAVE CHANGES writes to
that row, so it survives refreshes **and** deploys and shows up on every TV that
org has open.

> The only state that is per-device is the **demo board** for anonymous
> visitors (localStorage). Real customers are always org-scoped in Supabase.

---

## 3. Database migrations (the one time code and data meet)

Ordinary deploys need **no** migration. You only run one when you deliberately
change the database shape (a new column/table/policy), and it is **additive and
one-time**, never part of every deploy.

- Migrations live in `supabase/migrations/NNNN_*.sql`, applied in order.
- Applied so far (College project): `0001`, `0004`, `0005` (schema), `0006`
  (org boards + `bootstrap_org`), `0007` (Stripe billing columns).
  `0002`/`0003` are **NFL-only team seeds — skip them on College.**
- **Run them additively.** Write migrations so they can run on a live database
  without dropping or rewriting existing rows (`add column`, `create table if
  not exists`, `create policy`). Never `drop`/`truncate` customer tables.
- **Apply:** paste the migration's SQL into the Supabase **SQL Editor** and run
  it, or `supabase db push` if the CLI is linked. Do this **once per project**,
  and keep NFL and College migrations in their own projects.
- **Order of operations for a shape change:** ship the migration first (old code
  still works against the new shape), then deploy the code that uses it.

Edge Functions (`supabase/functions/*`) are deployed separately from the web
app: `supabase functions deploy <name>`. They read secrets from Supabase
function config (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`,
`STRIPE_PRICE_ANNUAL`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_SITE_URL`). Secrets never
live in the repo or the client bundle.

---

## 4. Environment variables

Frontend env vars are **baked in at build time** (Vite inlines `VITE_*`), so
changing one requires a **rebuild/redeploy**, not just a restart.

| Where | Variable | Purpose |
|---|---|---|
| Vercel project (College) | `VITE_SUPABASE_URL` | `https://wwpwjfrrywzmmbjintgp.supabase.co` |
| Vercel project (College) | `VITE_SUPABASE_ANON_KEY` | publishable key (`sb_publishable_…`) |
| Vercel project (either) | `VITE_BOARD_ID` | which shared board a non-org deploy reads (defaults to `default`) |
| Supabase functions | Stripe secrets | see §3 — **server-side only, never `VITE_`** |

- **Vercel value wins** over any committed `.env.production`. The committed file
  is only a fallback so a plain `npm run build` still targets the right project.
- **Never put a secret in a `VITE_` var** — those ship to the browser. Publishable/
  anon keys are fine (they're designed to be public and are gated by RLS). Secret
  keys (`sk_…`, service-role) live only in Supabase function config.
- After editing a Vercel env var, **trigger a redeploy** so it takes effect.

---

## 5. Versioning & rollback

**Every build is stamped.** The admin footer shows `v<pkg>+<git sha> · built
<date>` (injected by each app's `vite.config.ts` `define`, read via
`packages/core/src/lib/buildInfo.ts`). Read it off any running board's Admin page
to know exactly which commit is live.

**Rollback is instant and data-safe** because deploys never touch the database:

1. In the Vercel project → **Deployments**, find the last-known-good deployment
   (match its commit to the admin footer's sha).
2. **Promote / Redeploy** it → the production domain serves that build again in
   ~1 minute. Customer data is untouched (it's in Supabase, not the build).
3. If a bad **migration** is the problem, that's the exception: write a new
   additive migration that corrects it forward. Don't "roll back" a migration by
   dropping columns — that risks data. Fix-forward.

Bump `version` in the app's `package.json` for a meaningful release so the stamp
reads a real version (`v1.1.0+…`) instead of just a commit.

---

## 6. Keeping NFL and College separate (non-negotiable)

- **Separate Vercel projects, separate domains.** Never point College code at
  `pregameops.app` or vice-versa. Don't change a production domain during
  routine work.
- **Separate Supabase projects.** College data lives in
  `wwpwjfrrywzmmbjintgp`. NFL has its own project. Migrations, orgs, and boards
  are never shared or merged.
- **Separate Stripe accounts.** Each product has its own products/prices,
  webhook endpoint, and keys.
- **Shared only:** the rendering engine in `packages/core`. Anything
  product-specific (teams, schedules, branding defaults, domain, DB) lives in
  the app folder or that product's own backend.
- **When you touch `packages/core`,** you are touching both products — build and
  preview both before merging.

---

## 7. Quick reference

```bash
# Verify before every push
npm run build --workspace @gamedayops/college
npm run build --workspace @gamedayops/nfl        # also, if core changed

# Which build is live? → read the version in the Admin page footer,
# or check the promoted deployment's commit in Vercel.

# Deploy = push to the production branch (Vercel auto-builds the same URL).
# Rollback = promote the previous good deployment in Vercel (data is safe).
# DB change = additive migration in supabase/migrations, run ONCE per project.
```

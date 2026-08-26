# Training & Anatomy

A personal 3D exercise and human-anatomy reference, living inside this repo at
**`/#/train`** alongside the pre-game operations dashboard. Local-first: no
accounts, no login, no subscription, no cloud. Everything you create is stored
in this browser and exports to a single JSON file you own.

Reach it from the admin console header (**Training & Anatomy**) or go straight
to `/#/train`.

**Status: Phase 1 complete.** See [Phase status](#phase-status) for exactly what
is built, what is a labelled placeholder, and what is still to come.

---

## Contents

1. [What it does](#what-it-does)
2. [Integration with the existing app](#integration-with-the-existing-app)
3. [Folder structure](#folder-structure)
4. [Data architecture](#data-architecture)
5. [The anatomy system](#the-anatomy-system)
6. [Adding exercises](#adding-exercises)
7. [Adding assets](#adding-assets)
8. [Configuration](#configuration)
9. [Data ownership](#data-ownership)
10. [Phase status](#phase-status)
11. [Testing](#testing)

---

## What it does

The point of the app is the chain:

```
ANATOMY → MUSCLE → EXERCISE → MOVEMENT → TRAINING PURPOSE
```

and it is navigable in every direction:

- **Exercise → anatomy.** Opening an exercise paints its muscles on the body
  map by role (primary / secondary / stabilizer) and weights the visual by a
  training-emphasis value. Selecting a muscle in the list isolates it.
- **Muscle → exercises.** Every muscle page lists every exercise that trains it,
  labelled with the role that muscle plays there and filterable by role and by
  category.
- **Goal → exercises.** Training goals, movement patterns, equipment, muscle
  regions and return-to-play stages are all filters, and they combine.
- **Search.** One query runs across exercise names, muscles, categories,
  movements, equipment, goals, coaching cues and tags.

Ships with **67 exercises** across strength, power, plyometrics, speed, trunk,
stability and mobility, and **52 muscles** with anatomy, function, actions,
origin/insertion and related muscles.

---

## Integration with the existing app

The gameday dashboard is untouched. The training module is additive:

| Route | Owner |
| --- | --- |
| `/` | Pre-game dashboard (unchanged) |
| `/admin` | Admin console (one added link) |
| `/train/*` | Training & Anatomy |

- Mounted as a **sibling route** in `src/main.tsx` and **lazy-loaded**, so the TV
  board pays nothing for it at startup.
- Its own layout, navigation and styles — all scoped under `.tr-root` in
  `src/training/styles.css`, so no global CSS is modified.
- The dashboard sets `body { overflow: hidden }` for kiosk mode, so this module
  scrolls **inside** its own container rather than scrolling the document.
- Its own Tailwind palette (`tr-*` in `tailwind.config.js`) kept separate from
  the white-label team tokens, because the anatomy app is not team-themed.
- Its own storage key (`gameday-ops:training:v1`), independent of the board's.
- `DashboardProvider` / `ThemeProvider` now wrap the dashboard routes rather
  than the whole tree, so browsing the training app does not open a Supabase
  realtime connection. Dashboard and Admin still render inside both providers.

---

## Folder structure

```
src/training/
├── index.tsx                  # route table, code-splitting
├── styles.css                 # .tr-root scoped styles
├── layout/
│   └── TrainingLayout.tsx     # nav rail + mobile drawer + shell
├── config/
│   ├── visual.ts              # ← role colours & intensities (single source)
│   └── anatomyAssets.ts       # ← anatomy model registry
├── data/
│   ├── types.ts               # the whole schema
│   ├── taxonomy.ts            # categories, movements, equipment, goals
│   ├── muscles.ts             # 52 muscles
│   ├── queries.ts             # derived views (pure functions)
│   └── exercises/
│       ├── index.ts           # merges the files below
│       ├── strength.ts  power.ts  plyometrics.ts
│       └── speed.ts  trunk.ts  stability.ts  mobility.ts
├── lib/search.ts              # search scoring + combinable filters
├── state/
│   ├── persistence.ts         # localStorage + import normalisation
│   └── store.tsx              # the one provider
├── components/
│   ├── ui.tsx                 # primitives
│   ├── ExerciseCard.tsx  ExercisePicker.tsx  FilterPanel.tsx  MediaFrame.tsx
│   └── anatomy/
│       ├── bodyMapPaths.ts    # original SVG artwork
│       ├── BodyMap.tsx        # the renderer
│       └── AnatomyPanel.tsx   # viewer chrome (views, layers, zoom, legend)
└── pages/                     # Home, Library, ExerciseDetail, MuscleExplorer,
                               # MuscleDetail, Anatomy, Categories, Programs,
                               # Favorites, Settings, AddExercise
```

---

## Data architecture

No component hard-codes an exercise or a muscle. Everything renders from
`src/training/data/`, which is why the library scales to thousands of entries
and why an AI query layer could later reason over it without touching the UI.

```
Exercise   id, name, category, subcategory, description, movementPattern[],
           equipment[], difficulty, trainingGoals[], primaryMuscles[],
           secondaryMuscles[], stabilizers[], coachingCues[], commonErrors[],
           progressions[], regressions[], athleticApplications[],
           relatedExercises[], rtpStage?, tags[], assets{}

Muscle     id, name, latinName, region, group, layer, view, anatomy,
           functions[], actions[], origin, insertion, relatedMuscles[],
           anatomyModelId, bodyMapRegions[], mobilityNotes?

Movement   id, name, description, category
```

Muscle references carry an **emphasis** value (0–100):

```ts
primaryMuscles: [m('gluteus-maximus', 92), m('vastus-lateralis', 85)]
```

This is a **training-emphasis weighting** — an editorial coaching judgement used
to drive how strongly the anatomy paints. It is **not** an EMG measurement and
the UI says so everywhere it appears. If validated measurements are supplied
later, they belong in a separate field rather than overloading this one.

**Return to play** is a staging label (`rtpStage`) applied across the whole
library, not a bucket exercises live in — so a lift can be both a strength entry
and an intermediate-stage entry. It exists to sequence training complexity. It
makes no medical claims and is not a diagnostic or clearance tool.

---

## The anatomy system

**The model is not hard-coded anywhere.** Muscles bind to anatomy by a stable
key, `Muscle.anatomyModelId`:

- **Phase 1 (now):** that key resolves through `bodyMapRegions` to regions on the
  built-in 2D body map — original artwork in `bodyMapPaths.ts`. It is a real
  working viewer: selection, isolation, dimming, layer toggles (skin /
  superficial / deep / bones / joints), anterior–posterior switching, zoom and
  reset all function.
- **Phase 2:** the same key names a **mesh inside a GLB**. Register the model in
  `config/anatomyAssets.ts` and the viewer uses it — no muscle or exercise data
  changes.

Lateral, superior and inferior camera presets are shown **disabled** with a
tooltip, because a 2D map cannot honestly provide them. They light up with a 3D
model rather than being faked now.

Role colours, opacities, glow and the emphasis→intensity curve all live in
**one file**, `config/visual.ts`. Change a colour there and the body map, card
thumbnails, legends, role chips and (later) the 3D materials all follow.

---

## Adding exercises

**In the app:** *Exercise Library → Add exercise*. Saved entries merge into the
same list as the built-ins, so they are immediately searchable, filterable,
linkable and painted on the anatomy.

**In code:** add an object to any file in `data/exercises/`. Nothing else needs
to change.

```ts
{
  id: 'landmine-lateral-lunge',
  name: 'Landmine Lateral Lunge',
  category: 'strength',
  subcategory: 'unilateral',
  description: '…',
  movementPattern: ['lunge'],
  equipment: ['landmine'],
  difficulty: 'intermediate',
  trainingGoals: ['strength', 'mobility'],
  primaryMuscles: [m('gluteus-maximus', 85), m('adductor-magnus', 80)],
  secondaryMuscles: [m('vastus-lateralis', 65)],
  stabilizers: [m('gluteus-medius', 70), m('transversus-abdominis', 55)],
  coachingCues: ['…'],
  commonErrors: ['…'],
  progressions: ['cossack-squat'],   // exercise id, or free text
  regressions: ['Lateral step-down'],
  athleticApplications: ['…'],
  tags: ['frontal plane', 'adductor'],
  assets: {},
}
```

Custom entries with the same `id` as a built-in override it, so a shipped
exercise can be edited later without mutating source data.

---

## Adding assets

See **`public/assets/README.md`** for the full map. Short version:

| Put this | Here | Reference it as |
| --- | --- | --- |
| Anatomy model (GLB) | `public/assets/anatomy/` | register in `config/anatomyAssets.ts` |
| Exercise 3D model | `public/assets/exercises/` | `assets.modelUrl` / `animationUrl` |
| Demo video | `public/assets/videos/` | `assets.videoUrl` |
| Thumbnail | `public/assets/thumbnails/` | `assets.thumbnailUrl` |

Every slot is independent, so an exercise can gain a video now and a 3D
animation later. Prefer **GLB/GLTF** for 3D and **MP4/WebM** for video.

**No third-party anatomy models, animations or artwork ship with this repo.**
Add only assets you authored or are licensed to use, and record the licence
alongside them.

---

## Configuration

| File | Controls |
| --- | --- |
| `config/visual.ts` | Role colours, opacities, glow, emphasis curve, disclaimer copy |
| `config/anatomyAssets.ts` | Which anatomy model loads and how meshes map to muscles |
| `data/taxonomy.ts` | Categories, subcategories, movements, equipment, goals, regions |
| `state/persistence.ts` | Storage key, default settings, import normalisation |

---

## Data ownership

- Everything lives in `localStorage` under `gameday-ops:training:v1` on this
  device only. Nothing is sent anywhere.
- **Settings → Export JSON** downloads the complete blob: custom exercises,
  workouts, programs, favorites, recently viewed and settings.
- **Import** accepts it back in either **merge** (keep what you have, add the
  file) or **replace** mode. Imports are normalised against the default shape,
  so a partial or older file cannot leave the app broken.
- After first load the app works offline. The one network dependency is the
  Google Fonts stylesheet in `index.html` (inherited from the dashboard); the
  CSS declares system fallbacks, so the app degrades to system faces rather
  than breaking. Self-host the woff2 files if you want it fully offline.
- If the browser blocks local storage (private window, site data disabled), the
  app still runs and Settings says so explicitly — export before closing.

---

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| **1** | Navigation, dashboard, exercise database, search, filters, detail pages, favorites, local persistence, responsive layout | **Complete** |
| **2** | three.js / R3F viewer, 3D model loading, orbit camera, lateral & axial views | Architecture in place — renderer pending |
| **3** | Exercise video system, 3D exercise playback, exercise/anatomy sync | Video player and asset slots working; 3D player pending |
| **4** | Workout builder | **Working** — build, reorder, sets/reps/time/distance/rest/notes, saved locally |
| **5** | Programs: day / week / phase | Structure working and saving; templates and week duplication pending |
| **6** | Deeper muscle layers, anatomical search, muscle↔movement relationships | Layer flags, deep-muscle hatching and muscle↔exercise relationships in place |

Placeholders are labelled as placeholders in the UI — the anatomy page states
plainly that it is running the 2D renderer, and an exercise with no media says
so and names the folder and field to fill in. Nothing is dressed up as finished.

---

## Testing

Phase 1 was verified in a real browser (Chromium via Playwright), not by
eyeballing the UI. 63 functional checks covering: the existing dashboard still
rendering; search narrowing and multi-word queries; filters combining, writing
to the URL and surviving a reload; empty and reset states; favorites persisting
to `localStorage`; exercise detail content and anatomy highlighting; isolate and
view switching; recently-viewed tracking; muscle search, muscle→exercise
listings and role filtering; layer toggles; region click-to-select; category and
return-to-play pages; the workout builder adding, reordering and persisting;
add-exercise validation, save and immediate searchability; export → reset →
import round-tripping; unknown ids and routes; keyboard focus; and zero
horizontal overflow at 1440 / 820 / 390 px.

Training routes produce **no console or network errors**. (The dashboard route
logs Supabase connection failures when offline — pre-existing behaviour, since
it ships hard-coded Supabase defaults.)

```bash
npm install
npm run typecheck   # clean
npm run build       # clean
npm run dev         # then open /#/train
```

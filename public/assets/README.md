# Training & Anatomy assets

Everything in `public/` is copied to the site root at build time, so a file at
`public/assets/videos/back-squat.mp4` is referenced from data as
`./assets/videos/back-squat.mp4`.

**No third-party anatomy models, exercise animations or artwork ship with this
repository.** The 2D body map is original artwork authored for this project
(`src/training/components/anatomy/bodyMapPaths.ts`). Add only assets you have
authored yourself, licensed, or that carry a licence permitting your use — and
record that licence alongside the asset.

## Where things go

| Folder                     | Contents                                                            | Referenced by |
| -------------------------- | ------------------------------------------------------------------- | ------------- |
| `assets/anatomy/`          | Full-body anatomy models (`.glb` / `.gltf`)                          | `src/training/config/anatomyAssets.ts` |
| `assets/muscles/`          | Per-muscle meshes or illustrations, if you split them out            | `Muscle.anatomyModelId` |
| `assets/exercises/`        | Per-exercise 3D models and animations (`.glb` / `.gltf`)             | `Exercise.assets.modelUrl` / `animationUrl` |
| `assets/videos/`           | Demonstration clips (`.mp4`, `.webm`)                                | `Exercise.assets.videoUrl` |
| `assets/thumbnails/`       | Card and poster stills (`.jpg`, `.webp`, `.png`)                     | `Exercise.assets.thumbnailUrl` |
| `assets/icons/`            | Any custom iconography                                               | components |

## Installing an anatomy model

1. Drop the file into `assets/anatomy/`.
2. Add an entry to `ANATOMY_MODELS` in `src/training/config/anatomyAssets.ts`
   and set `ACTIVE_ANATOMY_MODEL` to its id.
3. Make sure each mesh in the model is named to match the `anatomyModelId`
   value on the corresponding muscle in `src/training/data/muscles.ts` (or set
   `meshNaming` to `prefix` if the model prefixes every mesh).

No exercise or muscle data has to change — the binding is by mesh name, which
is exactly why the model is not hard-coded anywhere in the UI.

## Attaching media to an exercise

Each slot is independent, so an exercise can have a video today and a 3D
animation later:

```ts
assets: {
  videoUrl: './assets/videos/rfe-split-squat.mp4',
  thumbnailUrl: './assets/thumbnails/rfe-split-squat.jpg',
  animationUrl: './assets/exercises/rfe-split-squat.glb',
}
```

Formats: prefer **GLB/GLTF** for 3D on the web (FBX is supported by the schema
but needs a converter step). Prefer **MP4 (H.264)** or **WebM** for video.

Nothing is preloaded at startup — videos load metadata only, and pages are
code-split — so adding assets does not slow down the dashboard.

## Placeholders

Where no asset exists, the app shows a clearly-labelled placeholder that names
the folder and the field to fill in. Placeholders are never dressed up as
finished artwork.

import { useEffect, useRef, useState } from 'react'
import type { Exercise } from '../data/types'
import { Button, cx, Eyebrow, PlaceholderNote } from './ui'

// ---------------------------------------------------------------------------
// Exercise media stage.
//
// Each asset slot on an exercise is independent, so this component picks the
// best available source and degrades honestly when nothing is installed yet:
//   animationUrl / modelUrl -> 3D asset (viewer lands in Phase 3)
//   videoUrl                -> HTML5 video with playback controls
//   thumbnailUrl            -> still image
//   nothing                 -> a clearly-labelled empty stage
// Videos are never preloaded — only metadata — so the library does not pull
// media at startup.
// ---------------------------------------------------------------------------

const SPEEDS = [0.25, 0.5, 1] as const

export default function MediaFrame({ exercise }: { exercise: Exercise }) {
  const { videoUrl, thumbnailUrl, animationUrl, modelUrl } = exercise.assets
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)

  // Reset transport state when the user navigates between exercises.
  useEffect(() => {
    setPlaying(false)
    setSpeed(1)
    setProgress(0)
    setFailed(false)
  }, [exercise.id])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed, videoUrl])

  const has3d = Boolean(animationUrl || modelUrl)

  function toggle() {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      void el.play().catch(() => setFailed(true))
    } else {
      el.pause()
    }
  }

  function restart() {
    const el = videoRef.current
    if (!el) return
    el.currentTime = 0
    void el.play().catch(() => setFailed(true))
  }

  return (
    <div className="tr-card overflow-hidden rounded-md">
      <div className="relative aspect-[4/3] w-full bg-[#080B11]">
        {videoUrl && !failed ? (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbnailUrl}
            preload="metadata"
            playsInline
            loop
            muted
            className="h-full w-full object-contain"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
            onTimeUpdate={(e) => {
              const el = e.currentTarget
              setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0)
            }}
          />
        ) : thumbnailUrl && !has3d ? (
          <img src={thumbnailUrl} alt={exercise.name} loading="lazy" className="h-full w-full object-contain" onError={() => setFailed(true)} />
        ) : (
          <EmptyStage exercise={exercise} has3d={has3d} mediaFailed={failed} />
        )}
      </div>

      {videoUrl && !failed ? (
        <div className="border-t border-tr-line px-3 py-2.5">
          <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-tr-line">
            <div className="h-full bg-tr-accent transition-[width] duration-150" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" onClick={toggle}>
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button size="sm" variant="ghost" onClick={restart}>
              Restart
            </Button>
            <div className="ml-auto flex items-center gap-1">
              <Eyebrow className="mr-1">Speed</Eyebrow>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={cx(
                    'tr-mono rounded-[3px] px-2 py-1 text-[11px] transition-colors',
                    speed === s ? 'bg-tr-accent text-[#04120E]' : 'text-tr-muted hover:bg-tr-hi hover:text-tr-text',
                  )}
                >
                  {s === 1 ? '1×' : `${s}×`}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EmptyStage({ exercise, has3d, mediaFailed }: { exercise: Exercise; has3d: boolean; mediaFailed: boolean }) {
  return (
    <div className="tr-placeholder-hatch flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <svg viewBox="0 0 24 24" aria-hidden className="h-9 w-9 text-tr-line2">
        <path d="M4 5h16v14H4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" />
      </svg>
      <div>
        <p className="tr-display text-[16px] text-tr-muted">
          {mediaFailed ? 'Media could not be loaded' : has3d ? '3D asset referenced' : 'No media installed yet'}
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-tr-dim">
          {mediaFailed
            ? 'The referenced file is missing or unreadable. Check the path on this exercise.'
            : has3d
              ? 'This exercise points at a 3D model. The in-app 3D player is Phase 3 — the reference is stored and will render once that lands.'
              : 'Drop a demonstration clip or still into the asset folders and reference it from this exercise.'}
        </p>
      </div>
      <div className="w-full max-w-md">
        <PlaceholderNote>
          Placeholder stage — no artwork ships with this exercise. Add files under <span className="tr-mono">public/assets/exercises/</span> and set{' '}
          <span className="tr-mono">videoUrl</span>, <span className="tr-mono">thumbnailUrl</span> or <span className="tr-mono">animationUrl</span> on{' '}
          <span className="tr-mono">{exercise.id}</span>.
        </PlaceholderNote>
      </div>
    </div>
  )
}

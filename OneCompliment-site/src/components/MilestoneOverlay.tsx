import { useEffect, useState } from 'react'
import type { Milestone } from '../lib/data'

type Props = {
  milestone: Milestone | null
  streak: number
  groupName?: string
  onContinue: () => void
}

/**
 * Milestone celebration. Preserved from legacy/index.html line ~865.
 * Confetti pieces are absolutely positioned and animate via the cffall keyframe.
 */
export function MilestoneOverlay({ milestone, streak, groupName, onContinue }: Props) {
  const [shown, setShown] = useState(false)
  const [confettiActive, setConfettiActive] = useState(false)

  useEffect(() => {
    if (!milestone) {
      setShown(false)
      setConfettiActive(false)
      return
    }
    const t1 = setTimeout(() => setShown(true), 200)
    const t2 = setTimeout(() => setConfettiActive(true), 700)
    const t3 = setTimeout(() => setConfettiActive(false), 6700)
    return () => { [t1, t2, t3].forEach(clearTimeout) }
  }, [milestone])

  if (!milestone) return null
  const m = milestone

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0D0D0D',
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          className={`milestone-card flex flex-col items-center text-center${shown ? ' show' : ''}`}
          style={{ width: '100%', maxWidth: 360, gap: 18 }}
        >
          <div
            style={{ fontSize: 64, filter: `drop-shadow(0 0 28px ${m.color}88)` }}
          >
            {m.emoji}
          </div>
          <div
            className="font-mono"
            style={{
              fontSize: 12,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              borderRadius: 20,
              padding: '5px 16px',
              color: m.color,
              background: `${m.color}18`,
              border: `1px solid ${m.color}44`,
            }}
          >
            {m.badge}
          </div>
          <div
            className="font-bold"
            style={{ fontSize: 52, letterSpacing: '-.03em', color: m.color }}
          >
            {streak}
          </div>
          <div
            style={{ fontSize: 13, color: 'rgba(242,237,228,.4)', marginTop: -16 }}
          >
            days straight
          </div>
          <div
            className="font-bold"
            style={{ fontSize: 18, color: '#F5F0E8', lineHeight: 1.3 }}
          >
            {m.title}
          </div>
          <div
            style={{
              fontSize: 15,
              color: 'rgba(242,237,228,.5)',
              lineHeight: 1.7,
              maxWidth: 300,
            }}
          >
            {m.message}
          </div>
          <div className="flex gap-2 justify-center">
            {m.confetti.slice(0, 7).map((e, i) => (
              <span key={i} style={{ fontSize: 20 }}>{e}</span>
            ))}
          </div>
          <div
            style={{ fontSize: 12, color: 'rgba(242,237,228,.3)', fontStyle: 'italic' }}
          >
            with {groupName || 'your squad'}
          </div>
          <button
            onClick={onContinue}
            className="font-bold"
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 14,
              padding: '18px 24px',
              fontSize: 16,
              fontFamily: 'var(--font-serif)',
              cursor: 'pointer',
              marginTop: 8,
              background: m.color,
              color: '#0C0C0C',
            }}
          >
            Continue →
          </button>
        </div>
      </div>
      {confettiActive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 99,
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                fontSize: `${14 + Math.random() * 16}px`,
                animationDuration: `${2 + Math.random() * 2}s`,
                animationDelay: `${Math.random() * 1.4}s`,
              }}
            >
              {m.confetti[i % m.confetti.length]}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

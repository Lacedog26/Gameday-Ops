import { useEffect, useRef, useState } from 'react'

type Props = {
  /** Called when the bloom animation finishes — Home advances to the Done screen */
  onFinish: () => void
}

/**
 * The bloom animation — preserved from the legacy site (line 845 of legacy/index.html).
 * Sequence:
 *   400ms  — sun pulses to scale 1.3
 *   800ms  — message changes to "Almost there..."
 *   1000ms — 8 light rays burst out (staggered 50ms)
 *   1400ms — ☀️ swaps to 🌻, scales to 1.4 with drop-shadow
 *   1750ms — emoji settles to scale 1.0 and starts the glow-pulse loop
 *   2600ms — onFinish() fires → advance to Done
 */
export function Bloom({ onFinish }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const [emoji, setEmoji] = useState('☀️')
  const [msg, setMsg] = useState('Take a breath.\nWrite something real.')

  // Latest onFinish — stored in a ref so the animation effect can fire
  // once on mount without restarting when the parent re-renders.
  const finishRef = useRef(onFinish)
  finishRef.current = onFinish

  useEffect(() => {
    const e = emojiRef.current
    const wrap = wrapRef.current
    if (!e || !wrap) return

    e.style.transform = 'scale(1)'
    e.style.filter = ''

    const t1 = setTimeout(() => { e.style.transform = 'scale(1.3)' }, 400)
    const t2 = setTimeout(() => { setMsg('Almost there...') }, 800)
    const t3 = setTimeout(() => {
      for (let i = 0; i < 8; i++) {
        const ray = document.createElement('div')
        ray.className = 'ray'
        ray.style.cssText = `--r:${i * 45}deg;animation:rayShoot 0.6s ease forwards ${i * 0.05}s`
        wrap.appendChild(ray)
        setTimeout(() => ray.remove(), 1000)
      }
    }, 1000)
    const t4 = setTimeout(() => {
      setEmoji('🌻')
      e.style.transform = 'scale(1.4)'
      e.style.filter = 'drop-shadow(0 0 28px rgba(245,200,66,.6))'
    }, 1400)
    const t5 = setTimeout(() => {
      e.style.transform = 'scale(1)'
      e.style.animation = 'glowPulse 2s ease-in-out infinite'
    }, 1750)
    const t6 = setTimeout(() => finishRef.current(), 2600)

    return () => { [t1, t2, t3, t4, t5, t6].forEach(clearTimeout) }
  }, [])

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: '80vh', gap: 32, paddingTop: 52 }}
    >
      <div className="bloom-wrap" ref={wrapRef}>
        <div className="bloom-emoji" ref={emojiRef}>{emoji}</div>
      </div>
      <div
        className="font-bold text-center"
        style={{ fontSize: 20, lineHeight: 1.3, whiteSpace: 'pre-line' }}
      >
        {msg}
      </div>
    </div>
  )
}

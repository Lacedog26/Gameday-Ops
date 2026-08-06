import { useState } from 'react'
import { ONBOARD_STEPS } from '../lib/data'

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0)
  const s = ONBOARD_STEPS[step]
  const isLast = step === ONBOARD_STEPS.length - 1

  const next = () => (isLast ? onFinish() : setStep(step + 1))

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '90vh' }}>
      <div className="w-full flex flex-col items-center gap-8 text-center">
        <div className="flex gap-2">
          {ONBOARD_STEPS.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === step ? 24 : 8,
                background: i === step ? 'var(--color-gold)' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
        <div className="bob" style={{ fontSize: 72 }}>{s.emoji}</div>
        <div className="flex flex-col gap-3.5">
          <div
            className="font-bold"
            style={{ fontSize: 'clamp(22px,5vw,28px)', lineHeight: 1.25, color: 'var(--text)' }}
          >
            {s.headline}
          </div>
          <div style={{ fontSize: 16, color: 'var(--dim)', lineHeight: 1.75 }}>{s.sub}</div>
        </div>
        <button onClick={next} className="oc-btn">
          {s.cta} →
        </button>
        {/* Skip intro removed per design feedback — the flow is only 3
            steps, the per-step education is worth it, and a skip
            button signals "this is optional" which undersells the
            content. */}
      </div>
    </div>
  )
}

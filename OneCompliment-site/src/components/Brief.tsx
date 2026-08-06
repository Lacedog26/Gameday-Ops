import type { Challenge } from '../lib/data'

type Props = {
  challenge: Challenge
  langFlag: string
  onOpenLang: () => void
  onBack: () => void
  onContinue: () => void
}

export function Brief({ challenge, langFlag, onOpenLang, onBack, onContinue }: Props) {
  return (
    <>
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="oc-btn-back">← Back</button>
        <button onClick={onOpenLang} className="oc-settings-btn">
          <span>{langFlag}</span>
        </button>
      </div>
      <div className="oc-label">TODAY'S COMPLIMENT</div>
      <h1
        className="font-bold"
        style={{ fontSize: 'clamp(24px,6vw,30px)', fontWeight: 700, lineHeight: 1.2 }}
      >
        {challenge.prompt}
      </h1>
      <div style={{ height: 1, background: 'var(--bord)' }} />
      <div className="flex flex-col gap-3.5">
        <div className="oc-label">THE RULE</div>
        <div
          style={{
            background: 'rgba(245,200,66,.06)',
            border: '1px solid rgba(245,200,66,.20)',
            borderRadius: 14,
            padding: '16px 18px',
            fontSize: 16,
            lineHeight: 1.7,
            color: 'var(--text)',
          }}
        >
          {challenge.rule}
        </div>
        <div
          style={{
            background: 'var(--surf)',
            border: '1px solid var(--bord)',
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div className="oc-label-dim" style={{ marginBottom: 10 }}>EXAMPLE</div>
          <div
            style={{
              fontSize: 16,
              fontStyle: 'italic',
              color: 'var(--dim)',
              lineHeight: 1.65,
              paddingLeft: 14,
              borderLeft: '2px solid rgba(245,200,66,.35)',
            }}
          >
            "{challenge.example}"
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 12, color: 'var(--faint)', marginTop: 10 }}
          >
            This is just one way. Yours will be completely different.
          </div>
        </div>
        <div
          className="flex gap-3 items-start"
          style={{ background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: '14px 16px' }}
        >
          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.6 }}>💡</span>
          <span
            style={{ fontSize: 13, color: 'var(--faint)', lineHeight: 1.7, fontStyle: 'italic' }}
          >
            {challenge.why}
          </span>
        </div>
      </div>
      <button onClick={onContinue} className="oc-btn">
        I get it — let me write it ☀️
      </button>
    </>
  )
}

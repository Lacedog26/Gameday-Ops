import { useState } from 'react'
import { LANGUAGES, type Language } from '../lib/data'

type Props = {
  open: boolean
  current: string
  onClose: () => void
  onSelect: (lang: Language) => void
}

export function LanguageSheet({ open, current, onClose, onSelect }: Props) {
  const [filter, setFilter] = useState('')
  if (!open) return null
  const f = filter.toLowerCase()
  const filtered = LANGUAGES.filter(
    (l) => l.name.toLowerCase().includes(f) || l.native.toLowerCase().includes(f),
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.88)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col gap-3.5"
        style={{
          background: '#141414',
          borderRadius: '24px 24px 0 0',
          padding: '16px 24px 52px',
          width: '100%',
          maxWidth: 480,
          maxHeight: '88vh',
          border: '1px solid rgba(255,255,255,.10)',
          borderBottom: 'none',
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: 'rgba(255,255,255,.2)',
            borderRadius: 99,
            alignSelf: 'center',
          }}
        />
        <div style={{ fontSize: 18, fontWeight: 700, color: '#F2EDE4' }}>🌐 Language</div>
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search languages..."
          style={{
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.10)',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 15,
            color: '#F2EDE4',
            fontFamily: 'var(--font-serif)',
            outline: 'none',
            flexShrink: 0,
          }}
        />
        <div className="flex flex-col gap-1.5" style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map((l) => {
            const selected = l.code === current
            return (
              <button
                key={l.code}
                onClick={() => {
                  onSelect(l)
                  setFilter('')
                  onClose()
                }}
                className="flex items-center gap-3 text-left w-full"
                style={{
                  background: selected ? 'rgba(245,200,66,.12)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${selected ? 'rgba(245,200,66,.35)' : 'rgba(255,255,255,.08)'}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  color: '#F2EDE4',
                }}
              >
                <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{l.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#F2EDE4' }}>{l.native}</div>
                  <div style={{ fontSize: 12, color: 'rgba(242,237,228,0.55)', marginTop: 2 }}>
                    {l.name}
                  </div>
                </div>
                {selected && (
                  <div style={{ fontSize: 16, color: '#F5C842', fontWeight: 700 }}>✓</div>
                )}
                {l.dir === 'rtl' && (
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      color: 'rgba(242,237,228,.4)',
                      background: 'rgba(255,255,255,.08)',
                      borderRadius: 4,
                      padding: '2px 6px',
                    }}
                  >
                    RTL
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <button onClick={onClose} className="oc-btn-ghost">Done</button>
      </div>
    </div>
  )
}

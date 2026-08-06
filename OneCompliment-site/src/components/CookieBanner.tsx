import { Link } from 'react-router-dom'

// The cookie banner's background is intentionally always dark — fixed-position
// attention element that needs to read the same in either system theme. So
// every color inside is also hardcoded, NOT pulled from `var(--text)` /
// `var(--dim)` / `var(--bord)`. Those CSS vars flip with prefers-color-scheme,
// which on a light-mode device painted dark text + a dark border on the
// already-dark banner → invisible. Lock the palette to the dark-theme values.
const TEXT_LIGHT = '#F2EDE4'
const DIM_LIGHT = 'rgba(242, 237, 228, 0.78)'
const BORDER_LIGHT = 'rgba(255, 255, 255, 0.18)'

type Props = {
  onAccept: () => void
  onReject: () => void
}

export function CookieBanner({ onAccept, onReject }: Props) {
  return (
    <div
      className="flex flex-col gap-3"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 500,
        background: 'rgba(12,12,12,.96)',
        border: `1px solid ${BORDER_LIGHT}`,
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div
        className="font-bold"
        style={{ fontSize: 14, color: TEXT_LIGHT }}
      >
        Privacy choices
      </div>
      <div
        style={{ fontSize: 12, lineHeight: 1.6, color: DIM_LIGHT }}
      >
        We use analytics to understand site traffic and improve OneC🌻mpliment. By tapping "Accept,"
        you agree to analytics cookies. See our{' '}
        <Link to="/privacy" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
          Privacy Policy
        </Link>
        .
      </div>
      <div className="flex gap-2.5">
        <button
          onClick={onReject}
          className="flex-1"
          style={{
            border: `1px solid ${BORDER_LIGHT}`,
            background: 'none',
            color: DIM_LIGHT,
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 13,
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
          }}
        >
          Not now
        </button>
        {/* Accept uses the green "lift" palette so the banner CTA does
            not compete with the gold "Give Today's Compliment" button
            on the page underneath. Same fix mobile shipped 2026-05-20. */}
        <button
          onClick={onAccept}
          className="flex-1 font-bold"
          style={{
            background: 'rgba(168,230,207,0.18)',
            border: '1px solid rgba(168,230,207,0.45)',
            color: '#A8E6CF',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 13,
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  )
}

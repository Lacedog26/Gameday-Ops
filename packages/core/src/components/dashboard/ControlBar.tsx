import { Link } from 'react-router-dom'

interface Props {
  soundEnabled: boolean
  colorblind: boolean
  isFullscreen: boolean
  onToggleSound: () => void
  onToggleColorblind: () => void
  onToggleFullscreen: () => void
  visible: boolean
}

/**
 * Auto-hiding control cluster (top-right). Stays out of the way on a TV but
 * appears on mouse movement for quick operator access. All actions also have
 * keyboard shortcuts so a kiosk remote can drive them.
 */
export default function ControlBar({
  soundEnabled,
  colorblind,
  isFullscreen,
  onToggleSound,
  onToggleColorblind,
  onToggleFullscreen,
  visible,
}: Props) {
  return (
    <div
      className={`pointer-events-none absolute right-6 top-6 z-40 flex gap-2 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-navy-900/85 px-2 py-1.5 backdrop-blur">
        <Btn active={soundEnabled} onClick={onToggleSound} title="Sound (S)">
          {soundEnabled ? '🔊' : '🔇'}
        </Btn>
        <Btn active={colorblind} onClick={onToggleColorblind} title="Colorblind mode (C)">
          👁
        </Btn>
        <Btn active={isFullscreen} onClick={onToggleFullscreen} title="Fullscreen (F)">
          ⛶
        </Btn>
        <Link
          to="/admin"
          className="pointer-events-auto rounded-full bg-bills-royal px-4 py-1.5 text-[0.9375rem] font-bold tracking-wider text-white hover:bg-bills-royal/80"
        >
          ADMIN
        </Link>
      </div>
    </div>
  )
}

function Btn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-9 w-9 place-items-center rounded-full text-[1.125rem] transition-colors ${
        active ? 'bg-white/15 text-white' : 'text-slate-400 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

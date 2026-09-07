import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { useNow } from '../../hooks/useNow'
import { useTimeline } from '../../hooks/useTimeline'
import { useAlertSounds } from '../../hooks/useAlertSounds'
import { useWakeLock } from '../../hooks/useWakeLock'
import { useFullscreen } from '../../hooks/useFullscreen'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import FitScreen from '../common/FitScreen'
import FullscreenButton from './FullscreenButton'
import Header from './Header'
import ScheduleTable from './ScheduleTable'
import ProgressRail from './ProgressRail'
import FocusPanel from './FocusPanel'
import CulturePanel from './CulturePanel'
import ControlBar from './ControlBar'
import ConnectionStatus from './ConnectionStatus'

/**
 * The full-screen TV dashboard. Composes the header, schedule board, progress
 * rail, focus panel, and culture panel, and wires the live clock, alert sounds,
 * wake-lock, fullscreen, keyboard shortcuts, and browser notifications.
 */
export default function Dashboard({ kiosk = false }: { kiosk?: boolean }) {
  const { state, actions } = useDashboard()
  const { settings } = state
  const nowMs = useNow(1000)
  const timelineState = useTimeline(nowMs)
  const { timeline, now, next, currentIndex, peak } = timelineState

  useAlertSounds(timeline, { enabled: settings.soundEnabled, volume: settings.volume })
  useWakeLock(settings.keepAwake)
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

  // Culture panel yields when an event hits the 2-min / GO NOW stage.
  const suppressCulture = peak === 'imminent' || peak === 'critical' || peak === 'go'

  // Browser notification when a group is cleared to go.
  useGoNotifications(now?.event.id ?? null, now?.level ?? null, now?.event.label ?? '')

  // Acknowledge the current GO event (Space/Enter or tap).
  const ackCurrentGo = useCallback(() => {
    if (now && now.level === 'go') actions.ackEvent(now.event.id)
  }, [now, actions])

  const shortcuts = useMemo(
    () => ({
      f: () => toggleFullscreen(),
      s: () => actions.setSettings({ soundEnabled: !settings.soundEnabled }),
      c: () => actions.setSettings({ colorblindMode: !settings.colorblindMode }),
      ' ': (e: KeyboardEvent) => {
        e.preventDefault()
        ackCurrentGo()
      },
      Enter: () => ackCurrentGo(),
    }),
    [toggleFullscreen, actions, settings.soundEnabled, settings.colorblindMode, ackCurrentGo],
  )
  useKeyboardShortcuts(shortcuts)

  // Auto-hide the control cluster after inactivity.
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    const show = () => {
      setControlsVisible(true)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3500)
    }
    show()
    window.addEventListener('pointermove', show)
    window.addEventListener('keydown', show)
    return () => {
      window.removeEventListener('pointermove', show)
      window.removeEventListener('keydown', show)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [])

  return (
    <FitScreen>
      <div className="relative flex h-full w-full flex-col text-white">
        {/* Kiosk (TV display) mode shows ZERO admin controls or navigation —
            only a discreet "Full Screen" button so an operator can hand the
            whole TV to the board (browser chrome + taskbar disappear). */}
        {kiosk ? (
          <FullscreenButton />
        ) : (
          <ControlBar
            soundEnabled={settings.soundEnabled}
            colorblind={settings.colorblindMode}
            isFullscreen={isFullscreen}
            onToggleSound={() => actions.setSettings({ soundEnabled: !settings.soundEnabled })}
            onToggleColorblind={() => actions.setSettings({ colorblindMode: !settings.colorblindMode })}
            onToggleFullscreen={toggleFullscreen}
            visible={controlsVisible}
          />
        )}

        <ConnectionStatus />

        <Header
          nowMs={nowMs}
          kickoffAt={timelineState.kickoffAt}
          secondsToKickoff={timelineState.secondsToKickoff}
        />

        {/* Body */}
        <div className="flex min-h-0 flex-1 gap-6 px-8 pb-6 pt-3">
          <ProgressRail timeline={timeline} currentIndex={currentIndex} />

          <ScheduleTable
            timeline={timeline}
            colorblind={settings.colorblindMode}
            onAcknowledge={actions.ackEvent}
          />

          <aside className="flex w-[37.5rem] shrink-0 flex-col gap-6">
            <div className="flex min-h-0 flex-[3] flex-col">
              <FocusPanel now={now} next={next} onAcknowledge={actions.ackEvent} />
            </div>
            <div className="flex min-h-0 flex-[2] flex-col">
              <CulturePanel suppressed={suppressCulture} />
            </div>
          </aside>
        </div>
      </div>
    </FitScreen>
  )
}

/** Fires a one-shot browser notification when an event transitions into GO. */
function useGoNotifications(eventId: string | null, level: string | null, label: string) {
  const lastNotified = useRef<string | null>(null)

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (!eventId || level !== 'go') return
    if (lastNotified.current === eventId) return
    lastNotified.current = eventId
    try {
      new Notification('GO NOW', { body: `${label} — send them out`, silent: false })
    } catch {
      /* ignore */
    }
  }, [eventId, level, label])
}

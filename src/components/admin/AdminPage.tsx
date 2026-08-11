import { Link } from 'react-router-dom'
import BillsMark from '../common/BillsMark'
import ScheduleCenterSection from './ScheduleCenterSection'
import GameSetupSection from './GameSetupSection'
import TemplatesSection from './TemplatesSection'
import ScheduleEditorSection from './ScheduleEditorSection'
import GraphicsSection from './GraphicsSection'
import QuotesSection from './QuotesSection'
import SettingsSection from './SettingsSection'
import DangerSection from './DangerSection'

/**
 * Operations control panel. Mobile-friendly, scrollable, and separate from the
 * TV route so editing never disturbs a running board (changes sync live via
 * localStorage across every open dashboard).
 */
export default function AdminPage() {
  return (
    <div className="field-bg h-full w-full overflow-y-auto text-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-navy-950/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <BillsMark className="h-10 w-10" />
          <div>
            <div className="font-display text-lg font-extrabold uppercase leading-none tracking-wide">
              Pre-Game Operations
            </div>
            <div className="text-xs font-semibold tracking-widest text-slate-400">ADMIN CONSOLE</div>
          </div>
        </div>
        <Link
          to="/"
          className="rounded-full bg-bills-red px-5 py-2 text-sm font-bold tracking-wider hover:bg-bills-red/85"
        >
          ← BACK TO BOARD
        </Link>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
        <ScheduleCenterSection />
        <GameSetupSection />
        <TemplatesSection />
        <ScheduleEditorSection />
        <GraphicsSection />
        <QuotesSection />
        <SettingsSection />
        <DangerSection />
        <footer className="py-6 text-center text-xs text-slate-500">
          Buffalo Bills Pre-Game Operations Dashboard · changes save automatically
        </footer>
      </main>
    </div>
  )
}

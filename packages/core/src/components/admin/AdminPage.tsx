import { Link } from 'react-router-dom'
import { useDashboard } from '../../context/DashboardContext'
import { useAuth } from '../../context/AuthProvider'
import { getTeam, productConfig } from '../../product'
import { resolveTeam } from '../../brand'
import TeamMonogram from '../common/TeamMonogram'
import ScheduleCenterSection from './ScheduleCenterSection'
import GameSetupSection from './GameSetupSection'
import TeamBrandingSection from './TeamBrandingSection'
import TemplatesSection from './TemplatesSection'
import ScheduleEditorSection from './ScheduleEditorSection'
import GraphicsSection from './GraphicsSection'
import QuotesSection from './QuotesSection'
import SettingsSection from './SettingsSection'
import BillingSection from './BillingSection'
import DangerSection from './DangerSection'
import { buildLabel } from '../../lib/buildInfo'

/**
 * Operations control panel. Mobile-friendly, scrollable, and separate from the
 * TV route so editing never disturbs a running board (changes sync live via
 * localStorage across every open dashboard).
 */
export default function AdminPage() {
  const { state } = useDashboard()
  const { user, signOut } = useAuth()
  const productName = productConfig().productName
  const team = resolveTeam(getTeam(state.game.teamId), state.teamBranding?.[state.game.teamId])
  const logo = state.teamLogos[team.id]?.url || team.assets.primaryLogoUrl

  return (
    <div className="field-bg h-full w-full overflow-y-auto text-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-navy-950/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={team.name} className="h-10 w-10 object-contain" />
          ) : (
            <TeamMonogram abbr={team.abbr} className="h-10 w-10" />
          )}
          <div>
            <div className="font-display text-lg font-extrabold uppercase leading-none tracking-wide">
              {productName}
            </div>
            <div className="text-xs font-semibold tracking-widest text-slate-400">ADMIN CONTROL CENTER</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => signOut()}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold tracking-wider text-slate-200 hover:bg-white/10"
              title={user.email ?? 'Sign out'}
            >
              Sign out
            </button>
          )}
          <Link
            to="/"
            className="rounded-full bg-team-primary px-5 py-2 text-sm font-bold tracking-wider hover:bg-team-primary/85"
          >
            ← BACK TO BOARD
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
        <ScheduleCenterSection />
        <GameSetupSection />
        <TeamBrandingSection />
        <TemplatesSection />
        <ScheduleEditorSection />
        <GraphicsSection />
        <QuotesSection />
        <SettingsSection />
        <BillingSection />
        <DangerSection />
        <footer className="py-6 text-center text-xs text-slate-500">
          {productName} · changes save automatically
          <span className="mx-2 opacity-40">·</span>
          <span className="tnum font-mono opacity-70" title="Deployed build">{buildLabel()}</span>
        </footer>
      </main>
    </div>
  )
}

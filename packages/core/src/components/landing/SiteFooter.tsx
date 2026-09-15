import { Link } from 'react-router-dom'
import { productConfig } from '../../product'

/** Public footer with brand + legal/support links, readable BEFORE purchase. */
export default function SiteFooter() {
  let product = 'GameDayOps College'
  try {
    product = productConfig().productName
  } catch {
    /* not configured in isolation */
  }
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-white/10 bg-[#04060c] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <div className="font-display text-lg font-extrabold uppercase tracking-wide text-white">{product}</div>
          <div className="mt-1 text-xs text-slate-500">Part of the GameDayOps platform · © {year}</div>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-400">
          <Link to="/pricing" className="hover:text-white">Pricing</Link>
          <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white">Terms of Service</Link>
          <Link to="/support" className="hover:text-white">Support</Link>
          <a href="#contact" className="hover:text-white">Contact</a>
          <Link to="/login" className="hover:text-white">Sign in</Link>
        </nav>
      </div>
    </footer>
  )
}

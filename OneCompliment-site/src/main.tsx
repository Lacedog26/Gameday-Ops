import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import About from './pages/About'
import Business from './pages/Business'
import Contact from './pages/Contact'
import Support from './pages/Support'
import Privacy from './pages/Privacy'
import Pro from './pages/Pro'
import History from './pages/History'
import LocalLeaderboard from './pages/LocalLeaderboard'
import ChoosePlan from './pages/ChoosePlan'
import Join from './pages/Join'
import Compliment from './pages/Compliment'
import NotFound from './pages/NotFound'
import Settings from './pages/Settings'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/business" element={<Business />} />
        <Route path="/contact" element={<Contact />} />
        {/* Support hub — the URL we point ASC Support URL at to satisfy
            Apple Guideline 1.5. FAQ + email + form links + policy links. */}
        <Route path="/support" element={<Support />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/pro" element={<Pro />} />
        <Route path="/history" element={<History />} />
        <Route path="/local" element={<LocalLeaderboard />} />
        <Route path="/create" element={<ChoosePlan />} />
        {/* Full-page Settings — replaces the old bottom-sheet modal.
            Reads ?view=link-email so other surfaces can deep-link
            into the OTP flow (e.g. create-group requires an email). */}
        <Route path="/settings" element={<Settings />} />
        {/* Email-invite deep-links — match mobile/buildMailto exactly. */}
        <Route path="/join/:type/:code" element={<Join />} />
        {/* Public compliment view — what an unregistered recipient sees
            when they tap the share link the sender pastes into iMessage
            / WhatsApp / DMs after lifting them on the web. */}
        <Route path="/c/:id" element={<Compliment />} />
        {/* Catch-all 404 — must stay last in the route list. Handles
            mistyped URLs, expired share links, and legacy static-site
            paths (onecompliment-org.html etc.) with a soft landing. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

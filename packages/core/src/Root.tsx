import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import { DashboardProvider } from './context/DashboardContext'
import { ThemeProvider } from './context/ThemeProvider'
import AdminPage from './components/admin/AdminPage'
import Dashboard from './components/dashboard/Dashboard'
import './index.css'

// The shared GameDayOps application shell. HashRouter keeps deep links working
// on static hosts / TV kiosks with no server-side routing. Product data must be
// configured (configureProduct) before this renders.
export function GameDayOpsRoot() {
  return (
    <React.StrictMode>
      <DashboardProvider>
        <ThemeProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<App />}>
                <Route index element={<Dashboard />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </ThemeProvider>
      </DashboardProvider>
    </React.StrictMode>
  )
}

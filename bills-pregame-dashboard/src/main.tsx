import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import { DashboardProvider } from './context/DashboardContext'
import AdminPage from './components/admin/AdminPage'
import Dashboard from './components/dashboard/Dashboard'
import './index.css'

// HashRouter keeps deep links working when the app is served from a static
// file host or opened directly on a TV kiosk (no server-side routing needed).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DashboardProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Dashboard />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </DashboardProvider>
  </React.StrictMode>,
)

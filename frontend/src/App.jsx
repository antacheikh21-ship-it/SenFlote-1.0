import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore  from '@/stores/authStore'
import PrivateRoute  from '@/components/PrivateRoute'
import AppLayout     from '@/components/layout/AppLayout'
import LoginPage     from '@/pages/LoginPage'
import RegisterPage  from '@/pages/RegisterPage'
import LiveTracking   from '@/pages/LiveTracking'
import PlaybackPage   from '@/pages/PlaybackPage'
import DashboardPage  from '@/pages/DashboardPage'
import ReportsPage    from '@/pages/ReportsPage'
import GeofencesPage  from '@/pages/GeofencesPage'
import AlertsPage     from '@/pages/AlertsPage'
import SettingsPage   from '@/pages/SettingsPage'
import BillingPage    from '@/pages/BillingPage'
import AdminPage      from '@/pages/AdminPage'

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => { init() }, [init])

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Playback plein écran */}
      <Route path="/trips/:tripId/playback" element={
        <PrivateRoute><PlaybackPage /></PrivateRoute>
      } />

      {/* App shell — protégé */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/tracking" replace />} />
        <Route path="/tracking"  element={<LiveTracking />} />
        <Route path="/dashboard"  element={<DashboardPage />} />
        <Route path="/geofences" element={<GeofencesPage />} />
        <Route path="/reports"   element={<ReportsPage />} />
        <Route path="/alerts"    element={<AlertsPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
        <Route path="/billing"   element={<BillingPage />} />
        <Route path="/admin"     element={<AdminPage />} />
      </Route>
    </Routes>
  )
}

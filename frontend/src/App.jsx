import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import PetProfile from './components/PetProfile'
import PricingSection from './components/PricingSection'
import VetAccessQR from './components/VetAccessQR'
import MobileAuthBridge from './components/MobileAuthBridge'
import MobileAuthCallback from './components/MobileAuthCallback'
import Layout from './components/Layout'
import MaintenanceGate from './components/MaintenanceGate'
import RequireAuth from './components/RequireAuth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/mobile-auth" element={<MobileAuthBridge />} />
        <Route path="/mobile-auth-callback" element={<MobileAuthCallback />} />
        <Route element={<MaintenanceGate />}>
          <Route path="/" element={<LandingPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pets/:id" element={<PetProfile />} />
              <Route path="/pets/:id/vet-access" element={<VetAccessQR />} />
              <Route path="/pricing" element={<PricingSection />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

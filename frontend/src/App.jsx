import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import PetProfile from './components/PetProfile'
import PricingSection from './components/PricingSection'
import PublicPlansPage from './components/PublicPlansPage'
import PublicVetAccess from './components/PublicVetAccess'
import VetAccessQR from './components/VetAccessQR'
import MobileAuthBridge from './components/MobileAuthBridge'
import MobileAuthCallback from './components/MobileAuthCallback'
import Layout from './components/Layout'
import MaintenanceGate from './components/MaintenanceGate'
import RequireAuth from './components/RequireAuth'
import RequirePro from './components/RequirePro'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/mobile-auth" element={<MobileAuthBridge />} />
        <Route path="/mobile-auth-callback" element={<MobileAuthCallback />} />
        <Route element={<MaintenanceGate />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/planes" element={<PublicPlansPage />} />
          {/* Public vet dossier opened from QR / PIN */}
          <Route path="/vet" element={<PublicVetAccess />} />
          <Route path="/vet/:pin" element={<PublicVetAccess />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              {/* Pricing reachable while unpaid so users can retry checkout */}
              <Route path="/pricing" element={<PricingSection />} />
              <Route element={<RequirePro />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pets/:id" element={<PetProfile />} />
                <Route path="/pets/:id/vet-access" element={<VetAccessQR />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

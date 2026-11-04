import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import MaintenanceGate from './components/MaintenanceGate'
import CookieNotice from './components/CookieNotice'

const Dashboard = lazy(() => import('./components/Dashboard'))
const PetProfile = lazy(() => import('./components/PetProfile'))
const PricingSection = lazy(() => import('./components/PricingSection'))
const PublicPlansPage = lazy(() => import('./components/PublicPlansPage'))
const PublicVetAccess = lazy(() => import('./components/PublicVetAccess'))
const VetAccessQR = lazy(() => import('./components/VetAccessQR'))
const MobileAuthBridge = lazy(() => import('./components/MobileAuthBridge'))
const MobileAuthCallback = lazy(() => import('./components/MobileAuthCallback'))
const Layout = lazy(() => import('./components/Layout'))
const RequireAuth = lazy(() => import('./components/RequireAuth'))
const RequirePro = lazy(() => import('./components/RequirePro'))
const LegalPage = lazy(() => import('./components/LegalPage'))

function PageFallback() {
  return <div className="min-h-screen bg-cyan-50 dark:bg-cyan-950" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/mobile-auth" element={<MobileAuthBridge />} />
          <Route path="/mobile-auth-callback" element={<MobileAuthCallback />} />
          <Route element={<MaintenanceGate />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/planes" element={<PublicPlansPage />} />
            <Route path="/legal/:doc" element={<LegalPage />} />
            <Route path="/vet" element={<PublicVetAccess />} />
            <Route path="/vet/:pin" element={<PublicVetAccess />} />
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
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
        <CookieNotice />
      </Suspense>
    </BrowserRouter>
  )
}

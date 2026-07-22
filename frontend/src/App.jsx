import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import PetProfile from './components/PetProfile'
import PricingSection from './components/PricingSection'
import VetAccessQR from './components/VetAccessQR'
import MedicalLog from './components/MedicalLog'
import Layout from './components/Layout'
import MaintenanceGate from './components/MaintenanceGate'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MaintenanceGate />}>
          <Route path="/" element={<LandingPage />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pets/:id" element={<PetProfile />} />
            <Route path="/pets/:id/log" element={<MedicalLog />} />
            <Route path="/pets/:id/vet-access" element={<VetAccessQR />} />
            <Route path="/pricing" element={<PricingSection />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

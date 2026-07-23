import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { MAINTENANCE_MODE } from '../config'

/** Blocks app routes during maintenance unless the user already has a session
 *  (backend allowlist enforces who can obtain/keep a valid JWT). */
export default function MaintenanceGate() {
  const location = useLocation()

  if (MAINTENANCE_MODE) {
    const token = localStorage.getItem('profipaws_token')
    if (!token && location.pathname !== '/') {
      return <Navigate to="/" replace />
    }
  }

  return <Outlet />
}

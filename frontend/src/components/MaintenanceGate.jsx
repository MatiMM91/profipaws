import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { MAINTENANCE_MODE } from '../config'

/** Blocks protected app routes during maintenance unless the user already has a session
 *  (backend allowlist enforces who can obtain/keep a valid JWT).
 *  Public marketing paths (/ and /planes) stay reachable. */
export default function MaintenanceGate() {
  const location = useLocation()

  if (MAINTENANCE_MODE) {
    const signedIn = Boolean(localStorage.getItem('profipaws_user'))
    const path = location.pathname
    const isPublic =
      path === '/' || path === '/planes' || path === '/vet' || path.startsWith('/vet/')
    if (!signedIn && !isPublic) {
      return <Navigate to="/" replace />
    }
  }

  return <Outlet />
}

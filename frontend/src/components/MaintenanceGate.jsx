import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { MAINTENANCE_MODE } from '../config'

/** Clears sessions and blocks app routes while the site is under development. */
export default function MaintenanceGate() {
  const location = useLocation()

  if (MAINTENANCE_MODE) {
    try {
      localStorage.removeItem('profipaws_token')
      localStorage.removeItem('profipaws_user')
    } catch {
      // ignore
    }
    if (location.pathname !== '/') {
      return <Navigate to="/" replace />
    }
  }

  return <Outlet />
}

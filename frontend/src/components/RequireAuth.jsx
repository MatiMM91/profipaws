import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isLoggedIn } from '../auth'

/** Requires a stored JWT for app pages (dashboard, pets, account pricing). */
export default function RequireAuth() {
  const location = useLocation()
  const token = isLoggedIn()

  if (!token) {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={next && next !== '/' ? `/?next=${encodeURIComponent(next)}` : '/'} replace />
  }

  return <Outlet />
}

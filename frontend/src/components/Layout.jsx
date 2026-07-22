import { NavLink, Outlet } from 'react-router-dom'
import { PawPrint, LayoutDashboard, CreditCard } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      <header className="border-b border-cyan-100/80 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <NavLink to="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold text-cyan-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white">
              <PawPrint size={18} />
            </span>
            Profipaws
          </NavLink>
          <nav className="flex items-center gap-6">
            <NavLink to="/dashboard" className="nav-link flex items-center gap-1.5">
              <LayoutDashboard size={16} /> Dashboard
            </NavLink>
            <NavLink to="/pricing" className="nav-link flex items-center gap-1.5">
              <CreditCard size={16} /> Planes
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

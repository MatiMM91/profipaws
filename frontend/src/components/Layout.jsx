import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PawPrint, LayoutDashboard, CreditCard } from 'lucide-react'
import PreferenceControls from './PreferenceControls'

export default function Layout() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 dark:from-cyan-950 dark:via-slate-950 dark:to-teal-950">
      <header className="border-b border-cyan-100/80 bg-white/70 backdrop-blur-md dark:border-cyan-900/60 dark:bg-cyan-950/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold text-cyan-900 dark:text-cyan-50">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white">
              <PawPrint size={18} />
            </span>
            Profipaws
          </NavLink>
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex items-center gap-4 sm:gap-6">
              <NavLink to="/dashboard" className="nav-link flex items-center gap-1.5">
                <LayoutDashboard size={16} /> {t('nav.dashboard')}
              </NavLink>
              <NavLink to="/pricing" className="nav-link flex items-center gap-1.5">
                <CreditCard size={16} /> {t('nav.plans')}
              </NavLink>
            </nav>
            <PreferenceControls variant="app" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

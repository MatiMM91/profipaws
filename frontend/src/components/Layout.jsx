import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, CreditCard, LogOut } from 'lucide-react'
import PreferenceControls from './PreferenceControls'
import BrandLogo from './BrandLogo'
import SiteFooter from './SiteFooter'
import { deleteAccount, isDemoUser, logout as endSession } from '../auth'

export default function Layout() {
  const { t } = useTranslation()

  async function logout() {
    await endSession()
    window.location.href = '/'
  }

  async function removeAccount() {
    if (!window.confirm(t('nav.deleteAccountConfirm'))) return
    try {
      await deleteAccount()
      window.location.href = '/'
    } catch (e) {
      window.alert(e.message || t('share.error'))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 dark:from-cyan-950 dark:via-slate-950 dark:to-teal-950">
      <header className="border-b border-cyan-100/80 bg-white/70 backdrop-blur-md dark:border-cyan-900/60 dark:bg-cyan-950/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3">
          <NavLink
            to="/dashboard"
            className="mr-auto flex shrink-0 items-center gap-2.5 font-display text-lg font-bold text-cyan-900 dark:text-cyan-50"
          >
            <BrandLogo className="h-9 w-9" />
            Profipaws
          </NavLink>

          <div className="order-2 flex items-center gap-2 sm:order-3">
            {!isDemoUser() && (
              <button
                type="button"
                onClick={removeAccount}
                className="text-sm text-cyan-800/80 underline-offset-2 hover:underline dark:text-cyan-200/80"
              >
                {t('nav.deleteAccount')}
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg nav-link"
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
            >
              <LogOut size={18} />
            </button>
          </div>

          <div className="order-3 flex w-full flex-wrap items-center gap-3 sm:order-2 sm:w-auto sm:justify-end sm:gap-4">
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
      <SiteFooter className="bg-white/40 dark:bg-cyan-950/40" />
    </div>
  )
}

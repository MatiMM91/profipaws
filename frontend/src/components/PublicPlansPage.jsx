import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home } from 'lucide-react'
import PreferenceControls from './PreferenceControls'
import BrandLogo from './BrandLogo'
import PricingSection from './PricingSection'
import { useTheme } from '../theme/ThemeProvider'
import { getToken } from '../auth'

/**
 * Marketing access page (public website) — single viewport, no scroll when possible.
 */
export default function PublicPlansPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const loggedIn = Boolean(getToken())
  const startHref = loggedIn ? '/dashboard' : '/?login=1'

  const navLink = isDark
    ? 'text-cyan-100/80 hover:text-white'
    : 'text-cyan-700 hover:text-cyan-900'

  return (
    <div
      className={`flex min-h-[100dvh] flex-col overflow-hidden transition-colors ${
        isDark
          ? 'bg-hero-glow bg-cyan-950 text-white'
          : 'bg-gradient-to-br from-cyan-50 via-white to-teal-100 text-cyan-950'
      }`}
    >
      <nav className="mx-auto flex w-full max-w-6xl shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link
          to="/"
          className={`flex items-center gap-2 font-display text-lg font-bold tracking-tight ${
            isDark ? 'text-white' : 'text-cyan-900'
          }`}
        >
          <BrandLogo className="h-8 w-8" />
          Profipaws
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${navLink}`}
          >
            <Home size={15} />
            {t('nav.home')}
          </Link>
          <PreferenceControls variant={isDark ? 'landing' : 'app'} />
          <Link
            to={startHref}
            className={`inline-flex h-8 items-center rounded-full px-3.5 text-sm font-semibold transition ${
              isDark
                ? 'bg-white text-cyan-950 hover:bg-cyan-50'
                : 'bg-cyan-700 text-white hover:bg-cyan-800'
            }`}
          >
            {loggedIn ? t('nav.dashboard') : t('nav.signIn')}
          </Link>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-2 sm:py-3">
        <PricingSection variant="public" compact />
      </main>
    </div>
  )
}

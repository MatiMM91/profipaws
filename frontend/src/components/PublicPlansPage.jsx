import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import PreferenceControls from './PreferenceControls'
import BrandLogo from './BrandLogo'
import PricingSection from './PricingSection'
import { useTheme } from '../theme/ThemeProvider'
import { getToken } from '../auth'

/**
 * Marketing access page (public website).
 * Account unlock lives at /pricing after login.
 */
export default function PublicPlansPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const loggedIn = Boolean(getToken())
  const startHref = loggedIn ? '/dashboard' : '/?login=1'

  return (
    <div
      className={`min-h-screen transition-colors ${
        isDark
          ? 'bg-hero-glow bg-cyan-950 text-white'
          : 'bg-gradient-to-br from-cyan-50 via-white to-teal-100 text-cyan-950'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
        <Link
          to="/"
          className={`flex items-center gap-2.5 font-display text-xl font-bold tracking-tight ${
            isDark ? 'text-white' : 'text-cyan-900'
          }`}
        >
          <BrandLogo className="h-10 w-10" />
          Profipaws
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <PreferenceControls variant={isDark ? 'landing' : 'app'} />
          <Link
            to={startHref}
            className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition ${
              isDark
                ? 'bg-white text-cyan-950 hover:bg-cyan-50'
                : 'bg-cyan-700 text-white hover:bg-cyan-800'
            }`}
          >
            {loggedIn ? t('nav.dashboard') : t('nav.signIn')}
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
        <Link
          to="/"
          className={`mb-8 inline-flex items-center gap-1.5 text-sm font-medium ${
            isDark ? 'text-cyan-200/80 hover:text-white' : 'text-cyan-700 hover:text-cyan-900'
          }`}
        >
          <ArrowLeft size={16} />
          {t('pricing.backHome')}
        </Link>
        <PricingSection variant="public" />
      </main>

      <footer
        className={`border-t px-4 py-8 text-center text-sm ${
          isDark ? 'border-cyan-800/60 text-cyan-300/70' : 'border-cyan-100 text-cyan-600'
        }`}
      >
        © {new Date().getFullYear()} Profipaws
      </footer>
    </div>
  )
}

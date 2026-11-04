import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, LogOut } from 'lucide-react'
import PreferenceControls from './PreferenceControls'
import BrandLogo from './BrandLogo'
import PricingSection from './PricingSection'
import LegalNavMenu from './LegalNavMenu'
import SiteFooter from './SiteFooter'
import { useTheme } from '../theme/ThemeProvider'
import { clearSession, getStoredUser, isLoggedIn } from '../auth'
import { fetchSubscriptionTier } from '../billing'

/**
 * Marketing access page. After canceling Stripe, unpaid sessions get a clear
 * “you’re signed in — pay, or sign out to go home / try demo” state.
 */
export default function PublicPlansPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [searchParams] = useSearchParams()
  const isDark = theme === 'dark'
  const [tier, setTier] = useState(null) // null | guest | free | pro
  const user = getStoredUser()
  const email = user?.email ? String(user.email) : ''

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next = await fetchSubscriptionTier()
      if (!cancelled) setTier(next)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const isPro = tier === 'pro'
  const unpaidSession = isLoggedIn() && tier === 'free'
  const leftCheckout =
    searchParams.get('upgrade') === 'canceled' ||
    searchParams.get('upgrade') === 'required'

  function signOutToHome() {
    clearSession()
    window.location.href = '/'
  }

  function signOutToDemo() {
    clearSession()
    window.location.href = '/?demo=1'
  }

  function signOutToLogin() {
    clearSession()
    window.location.href = '/?login=1'
  }

  const navLink = isDark
    ? 'text-cyan-100/80 hover:text-white'
    : 'text-cyan-700 hover:text-cyan-900'

  const ctaClass = `inline-flex h-8 items-center rounded-full px-3.5 text-sm font-semibold transition ${
    isDark
      ? 'bg-white text-cyan-950 hover:bg-cyan-50'
      : 'bg-cyan-700 text-white hover:bg-cyan-800'
  }`

  const softCta = `inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition ${
    isDark
      ? 'border-cyan-400/40 text-cyan-50 hover:bg-cyan-900/50'
      : 'border-cyan-300 text-cyan-800 hover:bg-cyan-50'
  }`

  return (
    <div
      className={`flex min-h-[100dvh] flex-col overflow-hidden transition-colors ${
        isDark
          ? 'bg-hero-glow bg-cyan-950 text-white'
          : 'bg-gradient-to-br from-cyan-50 via-white to-teal-100 text-cyan-950'
      }`}
    >
      <nav className="mx-auto flex w-full max-w-6xl shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3">
        {unpaidSession ? (
          <button
            type="button"
            onClick={signOutToHome}
            className={`flex items-center gap-2 font-display text-lg font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-cyan-900'
            }`}
          >
            <BrandLogo className="h-8 w-8" />
            Profipaws
          </button>
        ) : (
          <Link
            to="/"
            className={`flex items-center gap-2 font-display text-lg font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-cyan-900'
            }`}
          >
            <BrandLogo className="h-8 w-8" />
            Profipaws
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {unpaidSession ? (
            <button type="button" onClick={signOutToHome} className={softCta}>
              <LogOut size={15} />
              {t('pricing.signOutHome')}
            </button>
          ) : (
            <Link to="/" className={`inline-flex items-center gap-1.5 text-sm font-medium ${navLink}`}>
              <Home size={15} />
              {t('nav.home')}
            </Link>
          )}
          <PreferenceControls variant={isDark ? 'landing' : 'app'} />
          <LegalNavMenu variant={isDark ? 'landing' : 'app'} />
          {isPro ? (
            <Link to="/dashboard" className={ctaClass}>
              {t('nav.dashboard')}
            </Link>
          ) : unpaidSession ? null : (
            <Link to="/?login=1" className={ctaClass}>
              {t('nav.signIn')}
            </Link>
          )}
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-3 px-4 py-2 sm:py-3">
        {unpaidSession && (
          <div
            className={`mx-auto w-full max-w-3xl rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 ${
              isDark
                ? 'border-amber-400/30 bg-amber-500/10 text-amber-50'
                : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
            role="status"
          >
            <p className="font-display text-base font-bold sm:text-lg">
              {leftCheckout ? t('pricing.leftCheckoutTitle') : t('pricing.signedInUnpaidTitle')}
            </p>
            <p className={`mt-1 text-sm leading-relaxed ${isDark ? 'text-amber-50/85' : 'text-amber-900/90'}`}>
              {email
                ? t('pricing.leftCheckoutBodyEmail', { email })
                : t('pricing.leftCheckoutBody')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={signOutToHome} className={softCta}>
                <LogOut size={15} />
                {t('pricing.signOutHome')}
              </button>
              <button type="button" onClick={signOutToDemo} className={softCta}>
                {t('pricing.signOutDemo')}
              </button>
              <button type="button" onClick={signOutToLogin} className={`text-sm font-medium underline-offset-2 hover:underline ${navLink}`}>
                {t('pricing.switchAccount')}
              </button>
            </div>
          </div>
        )}

        <PricingSection variant="public" compact />
      </main>
      <SiteFooter />
    </div>
  )
}

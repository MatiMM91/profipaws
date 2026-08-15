import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import PreferenceControls from './PreferenceControls'
import BrandLogo from './BrandLogo'
import { useTheme } from '../theme/ThemeProvider'
import { getToken } from '../auth'

/**
 * Marketing plans page (public website).
 * Account plan management lives at /pricing after login.
 */
export default function PublicPlansPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [billing, setBilling] = useState('yearly')
  const isYearly = billing === 'yearly'
  const loggedIn = Boolean(getToken())

  const proPrice = isYearly ? t('pricing.proPriceYearly') : t('pricing.proPriceMonthly')
  const proPeriod = isYearly ? t('pricing.perYear') : t('pricing.perMonth')
  const proNote = isYearly ? t('pricing.yearlyNote') : t('pricing.monthlyNote')

  const muted = isDark ? 'text-cyan-100/80' : 'text-cyan-800/90'
  const heading = isDark ? 'text-white' : 'text-cyan-950'
  const accountHref = loggedIn ? '/pricing' : '/?login=1'
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

        <div className="text-center">
          <h1 className={`font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl ${heading}`}>
            {t('pricing.publicTitle')}
          </h1>
          <p className={`mx-auto mt-4 max-w-xl text-base sm:text-lg ${muted}`}>
            {t('pricing.publicSubtitle')}
          </p>

          <div
            className={`mx-auto mt-8 inline-flex rounded-xl border p-1 ${
              isDark ? 'border-cyan-400/25 bg-cyan-950/50' : 'border-cyan-200 bg-white'
            }`}
            role="group"
            aria-label={t('pricing.billingToggle')}
          >
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                !isYearly
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : isDark
                    ? 'text-cyan-200 hover:text-white'
                    : 'text-cyan-700 hover:text-cyan-900'
              }`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isYearly
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : isDark
                    ? 'text-cyan-200 hover:text-white'
                    : 'text-cyan-700 hover:text-cyan-900'
              }`}
            >
              {t('pricing.yearly')}
              <span className={`ml-1.5 text-xs font-medium ${isYearly ? 'text-cyan-100' : 'text-teal-600 dark:text-teal-400'}`}>
                {t('pricing.saveBadge')}
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <article
            className={`rounded-2xl border p-7 ${
              isDark
                ? 'border-white/10 bg-white/5 text-cyan-50'
                : 'border-cyan-100 bg-white text-cyan-950 shadow-sm'
            }`}
          >
            <h2 className="font-display text-2xl font-bold">{t('pricing.free')}</h2>
            <p className="mt-2">
              <span className="text-4xl font-bold">{t('pricing.freePrice')}</span>
              <span className={isDark ? 'text-cyan-300' : 'text-cyan-600'}> {t('pricing.forever')}</span>
            </p>
            <p className={`mt-2 text-sm ${isDark ? 'text-cyan-300/80' : 'text-cyan-600'}`}>{t('pricing.freeNote')}</p>
            <ul className="mt-6 space-y-3">
              {(t('pricing.freeFeatures', { returnObjects: true }) || []).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className={`mt-0.5 shrink-0 ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to={startHref}
              className={`mt-8 flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                isDark
                  ? 'border-cyan-400/40 text-cyan-50 hover:bg-cyan-900/50'
                  : 'border-cyan-300 text-cyan-800 hover:bg-cyan-50'
              }`}
            >
              {t('pricing.getStarted')}
            </Link>
          </article>

          <article className="rounded-2xl border border-cyan-500 bg-gradient-to-b from-cyan-600 to-cyan-800 p-7 text-white shadow-lg shadow-cyan-900/20">
            <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-semibold text-cyan-100">
              <Sparkles size={12} /> {t('pricing.recommended')}
            </span>
            <h2 className="font-display text-2xl font-bold">{t('pricing.pro')}</h2>
            <p className="mt-2">
              <span className="text-4xl font-bold">{proPrice}</span>
              <span className="text-cyan-100/80"> {proPeriod}</span>
            </p>
            <p className="mt-2 text-sm text-cyan-100/85">{proNote}</p>
            <ul className="mt-6 space-y-3">
              {(t('pricing.proFeatures', { returnObjects: true }) || []).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className="mt-0.5 shrink-0 text-cyan-200" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to={accountHref}
              className="mt-8 flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
            >
              {loggedIn ? t('pricing.managePlan') : t('pricing.upgrade')}
            </Link>
            <p className="mt-3 text-center text-xs text-cyan-100/70">{t('pricing.cancelAnytime')}</p>
          </article>
        </div>

        <p className={`mx-auto mt-10 max-w-2xl text-center text-xs ${isDark ? 'text-cyan-300/70' : 'text-cyan-600'}`}>
          {t('pricing.vatNote')}
        </p>
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

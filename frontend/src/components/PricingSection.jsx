import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { getStoredUser, isDemoUser } from '../auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function PricingSection({ variant = 'account', compact = false } = {}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  // null = still loading subscription for logged-in user
  const [tier, setTier] = useState(null) // null | guest | free | pro

  const ready = tier !== null
  const isPro = tier === 'pro'
  const isPublic = variant === 'public'

  async function loadSubscription() {
    const token = localStorage.getItem('profipaws_token')
    if (!token) {
      setTier('guest')
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/me`, { headers: authHeaders() })
      if (!res.ok) {
        setTier('free')
        return
      }
      const data = await res.json()
      setTier(String(data.tier || 'free').toLowerCase() === 'pro' ? 'pro' : 'free')
    } catch {
      setTier('free')
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [])

  async function startCheckout() {
    const token = localStorage.getItem('profipaws_token')
    if (!token) {
      window.location.href = '/?login=1&next=/pricing'
      return
    }
    if (isDemoUser(getStoredUser())) {
      alert(t('pricing.demoBlocked'))
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(typeof err.detail === 'string' ? err.detail : t('pricing.stripeMissing'))
        return
      }
      const data = await res.json()
      window.location.href = data.checkout_url
    } finally {
      setBusy(false)
    }
  }

  const demoFeatures = t('pricing.demoFeatures', { returnObjects: true }) || []
  const fullFeatures = t('pricing.fullFeatures', { returnObjects: true }) || []
  const shownDemo = compact ? demoFeatures.slice(0, 3) : demoFeatures
  const shownFull = compact ? fullFeatures.slice(0, 5) : fullFeatures

  return (
    <div className={`w-full ${compact ? 'space-y-4' : 'space-y-10'}`}>
      <div className="text-center">
        <h1
          className={`font-display font-bold text-cyan-950 dark:text-cyan-50 ${
            compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
          }`}
        >
          {isPublic ? t('pricing.publicTitle') : t('pricing.accountTitle')}
        </h1>
        <p
          className={`mx-auto max-w-xl text-cyan-700/80 dark:text-cyan-300/80 ${
            compact ? 'mt-1.5 text-sm' : 'mt-3'
          }`}
        >
          {isPublic ? t('pricing.publicSubtitle') : t('pricing.accountSubtitle')}
        </p>
      </div>

      <div className={`mx-auto grid max-w-3xl md:grid-cols-2 ${compact ? 'gap-3' : 'gap-6'}`}>
        <article
          className={`rounded-2xl border border-cyan-100 bg-white text-cyan-950 dark:border-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-50 ${
            compact ? 'p-4 sm:p-5' : 'p-7'
          }`}
        >
          <h2 className={`font-display font-bold ${compact ? 'text-xl' : 'text-2xl'}`}>
            {t('pricing.demoTitle')}
          </h2>
          <p className={compact ? 'mt-1' : 'mt-2'}>
            <span className={`font-bold ${compact ? 'text-3xl' : 'text-4xl'}`}>{t('pricing.demoPrice')}</span>
            <span className="text-cyan-600 dark:text-cyan-300"> {t('pricing.demoPeriod')}</span>
          </p>
          <p className={`text-cyan-600 dark:text-cyan-400 ${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'}`}>
            {t('pricing.demoNote')}
          </p>
          <ul className={compact ? 'mt-3 space-y-1.5' : 'mt-6 space-y-3'}>
            {shownDemo.map((f) => (
              <li key={f} className={`flex items-start gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                <Check size={compact ? 14 : 16} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-300" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            to="/?demo=1"
            className={`block w-full rounded-lg border border-cyan-200 text-center font-semibold text-cyan-800 transition hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-100 dark:hover:bg-cyan-950/60 ${
              compact ? 'mt-4 px-3 py-2 text-xs' : 'mt-8 px-4 py-2.5 text-sm'
            }`}
          >
            {t('pricing.tryDemo')}
          </Link>
        </article>

        <article
          className={`rounded-2xl border bg-gradient-to-b from-cyan-600 to-cyan-800 text-white shadow-lg shadow-cyan-900/20 ${
            isPro ? 'border-white ring-2 ring-white/50' : 'border-cyan-500'
          } ${compact ? 'p-4 sm:p-5' : 'p-7'}`}
        >
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-cyan-400/20 font-semibold text-cyan-100 ${
              compact ? 'mb-2 px-2.5 py-0.5 text-[10px]' : 'mb-3 px-3 py-1 text-xs'
            }`}
          >
            {isPro ? (
              t('pricing.yourAccess')
            ) : (
              <>
                <Sparkles size={12} /> {t('pricing.recommended')}
              </>
            )}
          </span>
          <h2 className={`font-display font-bold ${compact ? 'text-xl' : 'text-2xl'}`}>
            {t('pricing.fullAccess')}
          </h2>
          <p className={compact ? 'mt-1' : 'mt-2'}>
            <span className={`font-bold ${compact ? 'text-3xl' : 'text-4xl'}`}>{t('pricing.fullPrice')}</span>
            <span className="text-cyan-100/80"> {t('pricing.once')}</span>
          </p>
          <p className={`text-cyan-100/85 ${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'}`}>
            {t('pricing.fullNote')}
          </p>
          <ul className={compact ? 'mt-3 space-y-1.5' : 'mt-6 space-y-3'}>
            {shownFull.map((f) => (
              <li key={f} className={`flex items-start gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                <Check size={compact ? 14 : 16} className="mt-0.5 shrink-0 text-cyan-200" />
                {f}
              </li>
            ))}
          </ul>

          {!ready ? (
            <div
              className={`w-full rounded-lg border border-white/30 bg-white/10 text-center font-semibold text-cyan-100/90 ${
                compact ? 'mt-4 px-3 py-2 text-xs' : 'mt-8 px-4 py-2.5 text-sm'
              }`}
            >
              {t('pricing.loadingPlan')}
            </div>
          ) : isPro ? (
            <div
              className={`w-full rounded-lg border border-white/40 bg-white/15 text-center font-semibold text-white ${
                compact ? 'mt-4 px-3 py-2 text-xs' : 'mt-8 px-4 py-2.5 text-sm'
              }`}
            >
              {t('pricing.alreadyUnlocked')}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={startCheckout}
                disabled={busy}
                className={`w-full rounded-lg bg-white font-semibold text-cyan-800 transition hover:bg-cyan-50 disabled:opacity-60 ${
                  compact ? 'mt-4 px-3 py-2 text-xs' : 'mt-8 px-4 py-2.5 text-sm'
                }`}
              >
                {busy ? t('pricing.redirecting') : t('pricing.buyOnce')}
              </button>
              <p className={`text-center text-cyan-100/70 ${compact ? 'mt-2 text-[10px]' : 'mt-3 text-xs'}`}>
                {t('pricing.payOnceHint')}
              </p>
            </>
          )}
        </article>
      </div>

      {!compact && (
        <p className="mx-auto max-w-2xl text-center text-xs text-cyan-600 dark:text-cyan-400">
          {t('pricing.vatNote')}
        </p>
      )}
    </div>
  )
}

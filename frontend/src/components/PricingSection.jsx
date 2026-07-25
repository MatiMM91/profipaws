import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Sparkles } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function PricingSection() {
  const { t } = useTranslation()
  const [billing, setBilling] = useState('yearly') // yearly default = better perceived value
  const [busy, setBusy] = useState(false)
  const [tier, setTier] = useState(null) // null while loading / logged out
  const [billingInterval, setBillingInterval] = useState(null) // monthly | yearly | null
  const [message, setMessage] = useState('')

  async function loadSubscription() {
    const token = localStorage.getItem('profipaws_token')
    if (!token) {
      setTier('guest')
      setBillingInterval(null)
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/me`, { headers: authHeaders() })
      if (!res.ok) {
        setTier('free')
        setBillingInterval(null)
        return
      }
      const data = await res.json()
      const value = String(data.tier || 'free').toLowerCase()
      setTier(value === 'pro' ? 'pro' : 'free')
      const interval = data.billing_interval === 'monthly' || data.billing_interval === 'yearly'
        ? data.billing_interval
        : null
      setBillingInterval(interval)
      if (value === 'pro' && interval) {
        setBilling(interval)
      }
    } catch {
      setTier('free')
      setBillingInterval(null)
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [])

  async function startCheckout() {
    const token = localStorage.getItem('profipaws_token')
    if (!token) {
      window.location.href = '/'
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interval: billing }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.detail || t('pricing.stripeMissing'))
        return
      }
      const data = await res.json()
      window.location.href = data.checkout_url
    } finally {
      setBusy(false)
    }
  }

  async function changeInterval(nextInterval) {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/change-interval`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ interval: nextInterval }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(typeof data.detail === 'string' ? data.detail : t('pricing.changeError'))
        return
      }
      setBillingInterval(data.billing_interval || nextInterval)
      setBilling(data.billing_interval || nextInterval)
      setMessage(
        (data.billing_interval || nextInterval) === 'yearly'
          ? t('pricing.changedToYearly')
          : t('pricing.changedToMonthly'),
      )
      await loadSubscription()
    } finally {
      setBusy(false)
    }
  }

  const isYearly = billing === 'yearly'
  const isPro = tier === 'pro'
  const isFree = tier === 'free'
  const viewingCurrentInterval = isPro && billingInterval === billing
  const canSwitchInterval = isPro && billingInterval && billingInterval !== billing
  const proPrice = isYearly ? t('pricing.proPriceYearly') : t('pricing.proPriceMonthly')
  const proPeriod = isYearly ? t('pricing.perYear') : t('pricing.perMonth')
  const proNote = isYearly ? t('pricing.yearlyNote') : t('pricing.monthlyNote')

  return (
    <div className="space-y-10">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-cyan-950 dark:text-cyan-50 sm:text-4xl">
          {t('pricing.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-cyan-700/80 dark:text-cyan-300/80">
          {t('pricing.subtitle')}
        </p>

        <div
          className="mx-auto mt-6 inline-flex rounded-xl border border-cyan-200 bg-white p-1 dark:border-cyan-800 dark:bg-cyan-950/60"
          role="group"
          aria-label={t('pricing.billingToggle')}
        >
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              !isYearly
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-cyan-700 hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-white'
            }`}
          >
            {t('pricing.monthly')}
            {isPro && billingInterval === 'monthly' && (
              <span className={`ml-1.5 text-xs font-medium ${!isYearly ? 'text-cyan-100' : 'text-cyan-600 dark:text-cyan-400'}`}>
                · {t('pricing.yourPlan')}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setBilling('yearly')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isYearly
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-cyan-700 hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-white'
            }`}
          >
            {t('pricing.yearly')}
            {isPro && billingInterval === 'yearly' ? (
              <span className={`ml-1.5 text-xs font-medium ${isYearly ? 'text-cyan-100' : 'text-cyan-600 dark:text-cyan-400'}`}>
                · {t('pricing.yourPlan')}
              </span>
            ) : (
              <span className={`ml-1.5 text-xs font-medium ${isYearly ? 'text-cyan-100' : 'text-teal-600 dark:text-teal-400'}`}>
                {t('pricing.saveBadge')}
              </span>
            )}
          </button>
        </div>
        {message && (
          <p className="mx-auto mt-3 max-w-md text-sm text-teal-700 dark:text-teal-300">{message}</p>
        )}
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {/* Free */}
        <article
          className={`rounded-2xl border bg-white p-7 text-cyan-950 dark:bg-cyan-900/40 dark:text-cyan-50 ${
            isFree
              ? 'border-cyan-500 ring-2 ring-cyan-400/40 dark:border-cyan-400'
              : 'border-cyan-100 dark:border-cyan-800'
          }`}
        >
          {isFree && (
            <span className="mb-3 inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-800 dark:text-cyan-100">
              {t('pricing.yourPlan')}
            </span>
          )}
          <h2 className="font-display text-2xl font-bold">{t('pricing.free')}</h2>
          <p className="mt-2">
            <span className="text-4xl font-bold">{t('pricing.freePrice')}</span>
            <span className="text-cyan-600 dark:text-cyan-300"> {t('pricing.forever')}</span>
          </p>
          <p className="mt-2 text-sm text-cyan-600 dark:text-cyan-400">{t('pricing.freeNote')}</p>
          <ul className="mt-6 space-y-3">
            {(t('pricing.freeFeatures', { returnObjects: true }) || []).map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check size={16} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-300" />
                {f}
              </li>
            ))}
          </ul>
          <div
            className={`mt-8 w-full rounded-lg border px-4 py-2.5 text-center text-sm font-semibold ${
              isFree
                ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-950/60 dark:text-cyan-100'
                : 'border-cyan-200 text-cyan-700 dark:border-cyan-700 dark:text-cyan-200'
            }`}
          >
            {isFree ? t('pricing.currentPlan') : t('pricing.freeIncluded')}
          </div>
        </article>

        {/* Pro */}
        <article
          className={`rounded-2xl border bg-gradient-to-b from-cyan-600 to-cyan-800 p-7 text-white shadow-lg shadow-cyan-900/20 ${
            isPro ? 'border-white ring-2 ring-white/50' : 'border-cyan-500'
          }`}
        >
          <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-semibold text-cyan-100">
            {isPro ? (
              t('pricing.yourPlan')
            ) : (
              <>
                <Sparkles size={12} /> {t('pricing.recommended')}
              </>
            )}
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

          {viewingCurrentInterval ? (
            <div className="mt-8 w-full rounded-lg border border-white/40 bg-white/15 px-4 py-2.5 text-center text-sm font-semibold text-white">
              {t('pricing.currentPlan')}
              <span className="mt-1 block text-xs font-normal text-cyan-100/80">
                {billingInterval === 'yearly' ? t('pricing.onYearly') : t('pricing.onMonthly')}
              </span>
            </div>
          ) : canSwitchInterval ? (
            <>
              <button
                type="button"
                onClick={() => changeInterval(billing)}
                disabled={busy}
                className="mt-8 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50 disabled:opacity-60"
              >
                {busy
                  ? t('pricing.changing')
                  : billing === 'yearly'
                    ? t('pricing.switchToYearly')
                    : t('pricing.switchToMonthly')}
              </button>
              <p className="mt-3 text-center text-xs text-cyan-100/70">{t('pricing.switchHint')}</p>
            </>
          ) : isPro ? (
            <div className="mt-8 w-full rounded-lg border border-white/40 bg-white/15 px-4 py-2.5 text-center text-sm font-semibold text-white">
              {t('pricing.currentPlan')}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={startCheckout}
                disabled={busy || tier === null}
                className="mt-8 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50 disabled:opacity-60"
              >
                {busy ? t('pricing.redirecting') : t('pricing.upgrade')}
              </button>
              <p className="mt-3 text-center text-xs text-cyan-100/70">{t('pricing.cancelAnytime')}</p>
            </>
          )}
        </article>
      </div>

      <p className="mx-auto max-w-2xl text-center text-xs text-cyan-600 dark:text-cyan-400">
        {t('pricing.vatNote')}
      </p>
    </div>
  )
}

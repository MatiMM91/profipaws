import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Sparkles } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function PricingSection() {
  const { t } = useTranslation()
  const [billing, setBilling] = useState('yearly') // yearly default = better perceived value
  const [busy, setBusy] = useState(false)

  async function startCheckout() {
    const token = localStorage.getItem('profipaws_token')
    if (!token) {
      window.location.href = '/'
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

  const isYearly = billing === 'yearly'
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
            <span className={`ml-1.5 text-xs font-medium ${isYearly ? 'text-cyan-100' : 'text-teal-600 dark:text-teal-400'}`}>
              {t('pricing.saveBadge')}
            </span>
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {/* Free */}
        <article className="rounded-2xl border border-cyan-100 bg-white p-7 text-cyan-950 dark:border-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-50">
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
          <div className="mt-8 w-full rounded-lg border border-cyan-200 px-4 py-2.5 text-center text-sm font-semibold text-cyan-700 dark:border-cyan-700 dark:text-cyan-200">
            {t('pricing.currentPlan')}
          </div>
        </article>

        {/* Pro */}
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
          <button
            type="button"
            onClick={startCheckout}
            disabled={busy}
            className="mt-8 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50 disabled:opacity-60"
          >
            {busy ? t('pricing.redirecting') : t('pricing.upgrade')}
          </button>
          <p className="mt-3 text-center text-xs text-cyan-100/70">{t('pricing.cancelAnytime')}</p>
        </article>
      </div>

      <p className="mx-auto max-w-2xl text-center text-xs text-cyan-600 dark:text-cyan-400">
        {t('pricing.vatNote')}
      </p>
    </div>
  )
}

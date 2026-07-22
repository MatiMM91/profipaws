import { useTranslation } from 'react-i18next'
import { Check, Sparkles } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function PricingSection() {
  const { t } = useTranslation()

  async function startCheckout() {
    const token = localStorage.getItem('profipaws_token')
    if (!token) {
      window.location.href = '/'
      return
    }
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
      alert(err.detail || t('pricing.stripeMissing'))
      return
    }
    const data = await res.json()
    window.location.href = data.checkout_url
  }

  const plans = [
    {
      id: 'free',
      name: t('pricing.free'),
      price: '0 €',
      period: t('pricing.forever'),
      features: t('pricing.freeFeatures', { returnObjects: true }),
      cta: t('pricing.currentPlan'),
      highlight: false,
    },
    {
      id: 'pro',
      name: t('pricing.pro'),
      price: '5–10 €',
      period: t('pricing.perMonth'),
      features: t('pricing.proFeatures', { returnObjects: true }),
      cta: t('pricing.upgrade'),
      highlight: true,
    },
  ]

  return (
    <div className="space-y-10">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-cyan-950 dark:text-cyan-50 sm:text-4xl">
          {t('pricing.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-cyan-700/80 dark:text-cyan-300/80">
          {t('pricing.subtitle')}
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`rounded-2xl border p-7 ${
              plan.highlight
                ? 'border-cyan-500 bg-gradient-to-b from-cyan-600 to-cyan-800 text-white shadow-lg shadow-cyan-900/20'
                : 'border-cyan-100 bg-white text-cyan-950 dark:border-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-50'
            }`}
          >
            {plan.highlight && (
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-semibold text-cyan-100">
                <Sparkles size={12} /> {t('pricing.recommended')}
              </span>
            )}
            <h2 className="font-display text-2xl font-bold">{plan.name}</h2>
            <p className="mt-2">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className={plan.highlight ? 'text-cyan-100/80' : 'text-cyan-600 dark:text-cyan-300'}> {plan.period}</span>
            </p>
            <ul className="mt-6 space-y-3">
              {(Array.isArray(plan.features) ? plan.features : []).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className={plan.highlight ? 'mt-0.5 text-cyan-200' : 'mt-0.5 text-cyan-600 dark:text-cyan-300'} />
                  {f}
                </li>
              ))}
            </ul>
            {plan.id === 'pro' ? (
              <button type="button" onClick={startCheckout} className="mt-8 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50">
                {plan.cta}
              </button>
            ) : (
              <div className="mt-8 w-full rounded-lg border border-cyan-200 px-4 py-2.5 text-center text-sm font-semibold text-cyan-700 dark:border-cyan-700 dark:text-cyan-200">
                {plan.cta}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}

import { Check, Sparkles } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const plans = [
  {
    id: 'free',
    name: 'Gratuito',
    price: '0 €',
    period: 'para siempre',
    features: [
      '1 mascota registrada',
      'Historial médico básico',
      'Acceso PIN/QR temporal',
      'Diario de seguimiento',
    ],
    cta: 'Plan actual',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro / Premium',
    price: '5–10 €',
    period: '/ mes',
    features: [
      'Mascotas ilimitadas',
      'Alertas automatizadas',
      'Exportación de reportes (JSON/PDF)',
      'Prioridad en integración clínica',
    ],
    cta: 'Mejorar a Pro',
    highlight: true,
  },
]

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
    alert(err.detail || 'Stripe aún no está configurado. Revisa STRIPE_* en el backend.')
    return
  }
  const data = await res.json()
  window.location.href = data.checkout_url
}

export default function PricingSection() {
  return (
    <div className="space-y-10">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-cyan-950 sm:text-4xl">
          Planes de suscripción
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-cyan-700/80">
          Empieza gratis con una mascota. Pasa a Pro cuando necesites historiales ilimitados y alertas.
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`rounded-2xl border p-7 ${
              plan.highlight
                ? 'border-cyan-500 bg-gradient-to-b from-cyan-600 to-cyan-800 text-white shadow-lg shadow-cyan-900/20'
                : 'border-cyan-100 bg-white text-cyan-950'
            }`}
          >
            {plan.highlight && (
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-semibold text-cyan-100">
                <Sparkles size={12} /> Recomendado
              </span>
            )}
            <h2 className="font-display text-2xl font-bold">{plan.name}</h2>
            <p className="mt-2">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className={plan.highlight ? 'text-cyan-100/80' : 'text-cyan-600'}> {plan.period}</span>
            </p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className={plan.highlight ? 'mt-0.5 text-cyan-200' : 'mt-0.5 text-cyan-600'} />
                  {f}
                </li>
              ))}
            </ul>
            {plan.id === 'pro' ? (
              <button
                type="button"
                onClick={startCheckout}
                className="mt-8 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
              >
                {plan.cta}
              </button>
            ) : (
              <div className="mt-8 w-full rounded-lg border border-cyan-200 px-4 py-2.5 text-center text-sm font-semibold text-cyan-700">
                {plan.cta}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}

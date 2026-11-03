import { authHeaders, isDemoUser, getStoredUser } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/** @returns {Promise<'guest'|'free'|'pro'>} */
export async function fetchSubscriptionTier() {
  const token = localStorage.getItem('profipaws_token')
  if (!token) return 'guest'
  try {
    const res = await fetch(`${API_URL}/api/subscriptions/me`, { headers: authHeaders() })
    if (!res.ok) return 'free'
    const data = await res.json()
    return String(data.tier || 'free').toLowerCase() === 'pro' ? 'pro' : 'free'
  } catch {
    return 'free'
  }
}

/**
 * Create a Stripe Checkout session for the one-time €20 unlock.
 * @returns {Promise<string>} checkout URL
 */
export async function createCheckoutSession({ cancelPath = '/planes' } = {}) {
  const token = localStorage.getItem('profipaws_token')
  if (!token) {
    throw new Error('Not authenticated')
  }
  if (isDemoUser(getStoredUser())) {
    throw new Error('DEMO_BLOCKED')
  }
  const origin = window.location.origin
  const res = await fetch(`${API_URL}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      success_url: `${origin}/dashboard?upgrade=success`,
      cancel_url: `${origin}${cancelPath}?upgrade=canceled`,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Stripe checkout failed')
  }
  const data = await res.json()
  if (!data.checkout_url) {
    throw new Error('Stripe checkout failed')
  }
  return data.checkout_url
}

/** Start Checkout or fall back to the public plans page. */
export async function redirectToCheckout({ cancelPath = '/planes' } = {}) {
  try {
    const url = await createCheckoutSession({ cancelPath })
    window.location.href = url
  } catch (e) {
    if (e?.message === 'DEMO_BLOCKED') {
      window.location.href = '/planes'
      return
    }
    // Already unlocked, etc.
    if (typeof e?.message === 'string' && /ya tienes acceso/i.test(e.message)) {
      window.location.href = '/dashboard'
      return
    }
    console.error(e)
    window.location.href = `${cancelPath}?upgrade=canceled`
  }
}

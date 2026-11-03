const TOKEN_KEY = 'profipaws_token'
const USER_KEY = 'profipaws_user'

export const DEMO_USER_EMAIL = 'demo@profipaws.com'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function isDemoUser(user = getStoredUser()) {
  const email = user?.email
  return Boolean(email && String(email).toLowerCase() === DEMO_USER_EMAIL)
}

export function setSession(accessToken, user) {
  if (!accessToken) {
    throw new Error('Missing access token')
  }
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user || null))
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/** Exchange a Google ID token (or `dev:email` locally) for a Profipaws JWT. */
export async function exchangeGoogleToken(idToken) {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Error')
  }
  const data = await res.json()
  if (!data.access_token) {
    throw new Error('Login failed: no access token')
  }
  setSession(data.access_token, data.user)
  return data
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function authHeaders(extra = {}) {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

/** If the API says the session is invalid, clear it and send the user to login. */
export function handleAuthFailure(status, { redirect = true } = {}) {
  if (status !== 401) return false
  clearSession()
  if (redirect && typeof window !== 'undefined') {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`
    const q = next && next !== '/' ? `?next=${encodeURIComponent(next)}` : ''
    window.location.href = `/${q}`
  }
  return true
}

const TOKEN_KEY = 'profipaws_token'
const USER_KEY = 'profipaws_user'

export const DEMO_USER_EMAIL = 'demo@profipaws.com'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function installApiCredentials() {
  if (typeof window === 'undefined' || window.__profipawsFetchPatched) return
  const native = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
      if (url.startsWith(API_URL)) {
        return native(input, { ...init, credentials: init.credentials || 'include' })
      }
    } catch {
      /* use the original request */
    }
    return native(input, init)
  }
  window.__profipawsFetchPatched = true
}

installApiCredentials()

export function getToken() {
  return null
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function isLoggedIn() {
  return Boolean(getStoredUser())
}

export function isDemoUser(user = getStoredUser()) {
  const email = user?.email
  return Boolean(email && String(email).toLowerCase() === DEMO_USER_EMAIL)
}

export function setSession(_accessToken, user) {
  if (!user) {
    throw new Error('Missing user')
  }
  localStorage.removeItem(TOKEN_KEY)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/** Exchange a Google ID token (or `dev:email` locally) for a Profipaws session cookie. */
export async function exchangeGoogleToken(idToken) {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id_token: idToken }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Error')
  }
  const data = await res.json()
  if (!data.user) {
    throw new Error('Login failed')
  }
  setSession(data.access_token, data.user)
  return data
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function logout() {
  try {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
  } catch {
    /* the cookie is cleared locally either way */
  }
  clearSession()
}

export async function deleteAccount() {
  const res = await fetch(`${API_URL}/api/auth/me`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Error')
  }
  clearSession()
}

export function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
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

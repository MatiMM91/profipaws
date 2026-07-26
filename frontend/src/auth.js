const TOKEN_KEY = 'profipaws_token'
const USER_KEY = 'profipaws_user'

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

export function setSession(accessToken, user) {
  if (!accessToken) {
    throw new Error('Missing access token')
  }
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user || null))
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

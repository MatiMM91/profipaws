import { API_URL } from '../constants'
import { clearSession, getToken } from '../auth/session'

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

export async function api(path, { method = 'GET', body, token, headers = {}, formData } = {}) {
  const authToken = token ?? (await getToken())
  const finalHeaders = {
    ...(formData ? {} : { 'Content-Type': 'application/json' }),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...headers,
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: formData ? formData : body != null ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    await clearSession()
    throw new ApiError('Unauthorized', 401)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const detail = err.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
          : `Request failed (${res.status})`
    throw new ApiError(message, res.status, detail)
  }

  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  return res.blob()
}

export function downloadUrl(path, token) {
  return `${API_URL}${path}${token ? `?token=${encodeURIComponent(token)}` : ''}`
}

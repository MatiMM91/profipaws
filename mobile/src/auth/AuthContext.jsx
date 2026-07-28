import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clearSession, getStoredUser, getToken, setSession } from './session'
import { API_URL } from '../constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [t, u] = await Promise.all([getToken(), getStoredUser()])
      if (!cancelled) {
        setToken(t)
        setUser(u)
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loginWithIdToken = useCallback(async (idToken) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(typeof err.detail === 'string' ? err.detail : 'Login failed')
    }
    const data = await res.json()
    if (!data.access_token) throw new Error('Login failed: no access token')
    await setSession(data.access_token, data.user)
    setToken(data.access_token)
    setUser(data.user)
    return data
  }, [])

  const loginDev = useCallback(
    async (email = 'demo@profipaws.com') => loginWithIdToken(`dev:${email}`),
    [loginWithIdToken],
  )

  const logout = useCallback(async () => {
    await clearSession()
    setToken(null)
    setUser(null)
  }, [])

  const refreshSession = useCallback(async () => {
    const [t, u] = await Promise.all([getToken(), getStoredUser()])
    setToken(t)
    setUser(u)
  }, [])

  const value = useMemo(
    () => ({
      ready,
      token,
      user,
      isAuthenticated: Boolean(token),
      loginWithIdToken,
      loginDev,
      logout,
      refreshSession,
    }),
    [ready, token, user, loginWithIdToken, loginDev, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

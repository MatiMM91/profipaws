import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BrandLogo from './BrandLogo'
import { MAINTENANCE_MODE } from '../config'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const APP_SCHEME = 'profipaws://auth'

async function exchangeGoogleToken(idToken) {
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
  if (!data.access_token) throw new Error('Login failed: no access token')
  return data
}

function redirectToApp(data) {
  const params = new URLSearchParams({
    access_token: data.access_token,
    user: JSON.stringify(data.user || {}),
  })
  window.location.href = `${APP_SCHEME}?${params.toString()}`
}

/**
 * HTTPS bridge for Expo Go Google Sign-In.
 * Google blocks exp:// redirects; this page uses the same web OAuth as the SPA,
 * then deep-links back into the native app.
 */
export default function MobileAuthBridge() {
  const { t } = useTranslation()
  const googleBtnRef = useRef(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('ready')

  useEffect(() => {
    if (MAINTENANCE_MODE) {
      setError(t('landing.maintenanceLoginDenied'))
      return undefined
    }
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID no configurado en el frontend.')
      return undefined
    }

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            setStatus('exchanging')
            if (!response?.credential) throw new Error(t('landing.loginFailed'))
            const data = await exchangeGoogleToken(response.credential)
            setStatus('redirecting')
            redirectToApp(data)
          } catch (e) {
            setStatus('ready')
            setError(e.message || t('landing.loginFailed'))
          }
        },
        auto_select: false,
        ux_mode: 'popup',
      })
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 280,
        })
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle()
      return undefined
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initGoogle
    document.body.appendChild(script)
    return () => script.remove()
  }, [t])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-teal-100 px-6 text-cyan-950">
      <div className="w-full max-w-sm rounded-2xl border border-cyan-200/80 bg-white/90 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex justify-center">
          <BrandLogo className="h-14 w-14" />
        </div>
        <h1 className="font-display text-2xl font-bold">Profipaws</h1>
        <p className="mt-2 text-sm text-cyan-700/80">
          {status === 'exchanging' || status === 'redirecting'
            ? 'Entrando en la app…'
            : 'Inicia sesión para continuar en la app móvil.'}
        </p>

        {error ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-center">
          <div ref={googleBtnRef} />
        </div>

        <p className="mt-6 text-xs text-cyan-600/70">
          Tras iniciar sesión volverás automáticamente a Expo Go.
        </p>
      </div>
    </div>
  )
}

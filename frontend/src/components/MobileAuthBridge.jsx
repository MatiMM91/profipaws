import { useEffect, useMemo, useRef, useState } from 'react'
import BrandLogo from './BrandLogo'
import { MAINTENANCE_MODE } from '../config'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const FALLBACK_SCHEME = 'profipaws://auth'

function isAllowedRedirect(uri) {
  if (!uri || typeof uri !== 'string') return false
  return (
    uri.startsWith('profipaws://') ||
    uri.startsWith('exp://') ||
    uri.startsWith('exps://')
  )
}

async function exchangeGoogleToken(idToken) {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Error al iniciar sesión')
  }
  const data = await res.json()
  if (!data.access_token) throw new Error('Login fallido: sin token')
  return data
}

function buildDeepLink(base, data) {
  const params = new URLSearchParams({
    access_token: data.access_token,
    user: JSON.stringify(data.user || {}),
  })
  const join = base.includes('?') ? '&' : '?'
  return `${base}${join}${params.toString()}`
}

/**
 * HTTPS bridge for Expo Go Google Sign-In.
 * Returns to the app via the redirect_uri provided by Expo (exp://… or profipaws://…).
 */
export default function MobileAuthBridge() {
  const googleBtnRef = useRef(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('loading')
  const [googleReady, setGoogleReady] = useState(false)
  const [deepLink, setDeepLink] = useState('')

  const redirectBase = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('redirect_uri')
    if (isAllowedRedirect(raw)) return raw
    return FALLBACK_SCHEME
  }, [])

  function goToApp(data) {
    const link = buildDeepLink(redirectBase, data)
    setDeepLink(link)
    setStatus('redirecting')

    // Custom Tabs / Expo WebBrowser listen for this navigation.
    window.location.replace(link)

    // If the browser ignores the custom scheme, offer a manual escape hatch.
    window.setTimeout(() => {
      setStatus('manual')
    }, 1200)
  }

  useEffect(() => {
    if (MAINTENANCE_MODE) {
      setStatus('ready')
      setError('Acceso no disponible mientras el sitio está en desarrollo.')
      return undefined
    }
    if (!GOOGLE_CLIENT_ID) {
      setStatus('ready')
      setError('Google Client ID no configurado en el frontend (VITE_GOOGLE_CLIENT_ID).')
      return undefined
    }

    let cancelled = false

    async function onCredential(response) {
      try {
        setStatus('exchanging')
        setError('')
        if (!response?.credential) throw new Error('No se recibió credencial de Google')
        const data = await exchangeGoogleToken(response.credential)
        goToApp(data)
      } catch (e) {
        setStatus('ready')
        setError(e.message || 'No se pudo iniciar sesión')
      }
    }

    const initGoogle = () => {
      if (cancelled || !window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onCredential,
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
      setGoogleReady(true)
      setStatus('ready')
    }

    if (window.google?.accounts?.id) {
      initGoogle()
      return () => {
        cancelled = true
      }
    }

    const existing = document.querySelector('script[data-profipaws-gsi]')
    if (existing) {
      existing.addEventListener('load', initGoogle)
      return () => {
        cancelled = true
        existing.removeEventListener('load', initGoogle)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.profipawsGsi = '1'
    script.onload = initGoogle
    script.onerror = () => {
      setStatus('ready')
      setError('No se pudo cargar Google Sign-In. Comprueba la conexión.')
    }
    document.body.appendChild(script)
    return () => {
      cancelled = true
    }
  }, [redirectBase])

  function promptGoogle() {
    setError('')
    if (!window.google?.accounts?.id) {
      setError('Google aún no está listo. Espera un segundo e inténtalo de nuevo.')
      return
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
        setError('Usa el botón de Google de arriba para continuar.')
      }
    })
  }

  const busy = status === 'loading' || status === 'exchanging' || status === 'redirecting'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #ecfeff 0%, #ffffff 45%, #ccfbf1 100%)',
        color: '#083344',
        fontFamily: '"Source Sans 3", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          borderRadius: 20,
          border: '1px solid #a5f3fc',
          background: 'rgba(255,255,255,0.95)',
          padding: 28,
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(8,51,68,0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <BrandLogo className="h-14 w-14" />
        </div>
        <h1 style={{ fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: 28, margin: 0 }}>
          Profipaws
        </h1>
        <p style={{ marginTop: 10, fontSize: 15, color: 'rgba(14,116,144,0.85)', lineHeight: 1.45 }}>
          {status === 'loading' && 'Cargando inicio de sesión…'}
          {status === 'exchanging' && 'Validando con Profipaws…'}
          {status === 'redirecting' && 'Volviendo a la app…'}
          {status === 'manual' && 'Casi listo. Pulsa el botón para abrir Expo Go.'}
          {status === 'ready' && 'Inicia sesión para continuar en la app móvil.'}
        </p>

        {error ? (
          <p
            role="alert"
            style={{
              marginTop: 16,
              borderRadius: 12,
              background: '#fffbeb',
              color: '#78350f',
              padding: '10px 12px',
              fontSize: 14,
            }}
          >
            {error}
          </p>
        ) : null}

        {status === 'manual' && deepLink ? (
          <a
            href={deepLink}
            style={{
              display: 'block',
              marginTop: 20,
              borderRadius: 12,
              background: '#0891b2',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              padding: '14px 16px',
              textDecoration: 'none',
            }}
          >
            Abrir Profipaws
          </a>
        ) : null}

        {status !== 'manual' && (
          <>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', minHeight: 44 }}>
              <div ref={googleBtnRef} />
            </div>

            {!busy && (
              <button
                type="button"
                onClick={promptGoogle}
                disabled={!googleReady && !GOOGLE_CLIENT_ID}
                style={{
                  marginTop: 16,
                  width: '100%',
                  borderRadius: 12,
                  border: 'none',
                  background: '#0891b2',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 15,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  opacity: !googleReady && !GOOGLE_CLIENT_ID ? 0.55 : 1,
                }}
              >
                Continuar con Google
              </button>
            )}
          </>
        )}

        <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(8,145,178,0.75)' }}>
          Tras iniciar sesión volverás automáticamente a Expo Go.
        </p>
      </div>
    </div>
  )
}

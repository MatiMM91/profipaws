import { useEffect, useRef, useState } from 'react'
import BrandLogo from './BrandLogo'
import { MAINTENANCE_MODE } from '../config'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const CLIP_PREFIX = 'PROFIPAWS_AUTH_V1:'

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

function buildPayload(data) {
  return (
    CLIP_PREFIX +
    JSON.stringify({
      access_token: data.access_token,
      user: data.user || null,
      ts: Date.now(),
    })
  )
}

function copyText(text) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    ta.remove()
    if (ok) return true
  } catch {
    /* fall through */
  }
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    )
  }
  return false
}

/**
 * Google login bridge for Expo Go.
 * Copies a one-time auth payload to the clipboard so the app can finish
 * login without relying on Custom Tab HTTPS/deep-link redirects (broken on Android).
 */
export default function MobileAuthBridge() {
  const googleBtnRef = useRef(null)
  const payloadRef = useRef('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('loading')
  const [googleReady, setGoogleReady] = useState(false)
  const [copied, setCopied] = useState(false)

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
        if (cancelled) return
        const payload = buildPayload(data)
        payloadRef.current = payload
        const ok = await copyText(payload)
        setCopied(Boolean(ok))
        setStatus('done')
      } catch (e) {
        if (cancelled) return
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
  }, [])

  async function handleSendToApp() {
    const payload = payloadRef.current
    if (!payload) return
    const ok = await copyText(payload)
    setCopied(Boolean(ok))
    try {
      window.location.href = 'profipaws://auth-done'
    } catch {
      /* ignore */
    }
  }

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

  const busy = status === 'loading' || status === 'exchanging'

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
          {status === 'ready' && 'Inicia sesión para continuar en la app móvil.'}
          {status === 'done' &&
            (copied
              ? '¡Listo! Vuelve a Expo Go: la app detectará el login sola.'
              : '¡Listo! Pulsa el botón de abajo y vuelve a Expo Go.')}
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

        {status === 'done' ? (
          <button
            type="button"
            onClick={handleSendToApp}
            style={{
              marginTop: 24,
              width: '100%',
              borderRadius: 12,
              border: 'none',
              background: '#0891b2',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              padding: '12px 16px',
              cursor: 'pointer',
            }}
          >
            Enviar sesión a la app
          </button>
        ) : null}

        {!busy && status !== 'done' && (
          <>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', minHeight: 44 }}>
              <div ref={googleBtnRef} />
            </div>
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
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PawPrint, Shield, Building2, QrCode, ArrowRight } from 'lucide-react'
import PreferenceControls from './PreferenceControls'
import { useTheme } from '../theme/ThemeProvider'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

async function exchangeGoogleToken(idToken) {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Error')
  }
  const data = await res.json()
  localStorage.setItem('profipaws_token', data.access_token)
  localStorage.setItem('profipaws_user', JSON.stringify(data.user))
  window.location.href = '/dashboard'
}

export default function LandingPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const googleBtnRef = useRef(null)
  const isDark = theme === 'dark'

  async function loginWithGoogle() {
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
      return
    }
    const email = prompt('Dev login — email:') || 'demo@profipaws.com'
    try {
      await exchangeGoogleToken(`dev:${email}`)
    } catch (e) {
      alert(e.message)
    }
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await exchangeGoogleToken(response.credential)
          } catch (e) {
            alert(e.message)
          }
        },
        auto_select: false,
        ux_mode: 'popup',
      })
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: isDark ? 'filled_black' : 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 260,
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
  }, [isDark, t])

  return (
    <div
      className={`min-h-screen transition-colors ${
        isDark
          ? 'bg-hero-glow bg-cyan-950 text-white'
          : 'bg-gradient-to-br from-cyan-50 via-white to-teal-100 text-cyan-950'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
        <div className={`flex items-center gap-2 font-display text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-cyan-900'}`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-white">
            <PawPrint size={20} />
          </span>
          Profipaws
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PreferenceControls variant={isDark ? 'landing' : 'app'} />
          <Link to="/pricing" className={`hidden text-sm sm:inline ${isDark ? 'text-cyan-100/80 hover:text-white' : 'text-cyan-700 hover:text-cyan-900'}`}>
            {t('nav.plans')}
          </Link>
          {GOOGLE_CLIENT_ID ? (
            <div ref={googleBtnRef} className="min-h-10" />
          ) : (
            <button type="button" onClick={loginWithGoogle} className="btn-primary bg-cyan-500 hover:bg-cyan-400">
              {t('nav.signInGoogle')}
            </button>
          )}
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-24 pt-10 lg:grid-cols-2 lg:pt-16">
        <div className="animate-fade-up">
          <p className={`mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}>
            {t('landing.eyebrow')}
          </p>
          <h1 className={`font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl ${isDark ? 'text-white' : 'text-cyan-950'}`}>
            {t('landing.headline')}
          </h1>
          <p className={`mt-5 max-w-lg text-lg ${isDark ? 'text-cyan-100/85' : 'text-cyan-800/90'}`}>
            {t('landing.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={loginWithGoogle} className="btn-primary gap-2 bg-cyan-500 hover:bg-cyan-400">
              {t('landing.ctaStart')} <ArrowRight size={16} />
            </button>
            <Link
              to="/pricing"
              className={`btn-secondary ${isDark ? 'border-cyan-400/40 bg-transparent text-cyan-50 hover:bg-cyan-900/50' : ''}`}
            >
              {t('landing.ctaPlans')}
            </Link>
          </div>
        </div>

        <div
          className={`animate-fade-up-delay relative overflow-hidden rounded-3xl border p-8 shadow-2xl ${
            isDark
              ? 'border-cyan-400/20 bg-gradient-to-br from-cyan-800/60 to-teal-900/40 shadow-cyan-950/50'
              : 'border-cyan-200 bg-white/80 shadow-cyan-900/10 backdrop-blur'
          }`}
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl animate-pulse-soft" />
          <div className="relative space-y-4">
            <Feature dark={isDark} icon={Shield} title={t('landing.featureClinical')} desc={t('landing.featureClinicalDesc')} />
            <Feature dark={isDark} icon={QrCode} title={t('landing.featureVet')} desc={t('landing.featureVetDesc')} />
            <Feature dark={isDark} icon={Building2} title={t('landing.featureB2b')} desc={t('landing.featureB2bDesc')} />
          </div>
        </div>
      </section>
    </div>
  )
}

function Feature({ icon: Icon, title, desc, dark }) {
  return (
    <div
      className={`flex gap-4 rounded-2xl border p-4 backdrop-blur-sm ${
        dark ? 'border-white/10 bg-white/5' : 'border-cyan-100 bg-cyan-50/80'
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${dark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
        <Icon size={20} />
      </span>
      <div>
        <h3 className={`font-display font-semibold ${dark ? 'text-white' : 'text-cyan-950'}`}>{title}</h3>
        <p className={`mt-1 text-sm ${dark ? 'text-cyan-100/70' : 'text-cyan-700/80'}`}>{desc}</p>
      </div>
    </div>
  )
}

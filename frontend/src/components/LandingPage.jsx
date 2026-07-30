import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  Building2,
  QrCode,
  ArrowRight,
  Construction,
  PawPrint,
  Syringe,
  Weight,
  CalendarDays,
  Bell,
  Users,
  FileBadge,
  Stethoscope,
  Activity,
  Download,
  KeyRound,
} from 'lucide-react'
import PreferenceControls from './PreferenceControls'
import BrandLogo from './BrandLogo'
import LoginModal from './LoginModal'
import { useTheme } from '../theme/ThemeProvider'
import { MAINTENANCE_MODE } from '../config'
import { getToken, setSession } from '../auth'

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
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Error')
  }
  const data = await res.json()
  if (!data.access_token) {
    throw new Error('Login failed: no access token')
  }
  setSession(data.access_token, data.user)
  return data
}

const OWNER_FEATURES = [
  { icon: PawPrint, titleKey: 'landing.featPets', descKey: 'landing.featPetsDesc' },
  { icon: Syringe, titleKey: 'landing.featHistory', descKey: 'landing.featHistoryDesc' },
  { icon: Stethoscope, titleKey: 'landing.featFollowUp', descKey: 'landing.featFollowUpDesc' },
  { icon: Weight, titleKey: 'landing.featWeight', descKey: 'landing.featWeightDesc' },
  { icon: CalendarDays, titleKey: 'landing.featCalendar', descKey: 'landing.featCalendarDesc' },
  { icon: Bell, titleKey: 'landing.featAlerts', descKey: 'landing.featAlertsDesc' },
  { icon: FileBadge, titleKey: 'landing.featPass', descKey: 'landing.featPassDesc' },
  { icon: Users, titleKey: 'landing.featShare', descKey: 'landing.featShareDesc' },
  { icon: QrCode, titleKey: 'landing.featPin', descKey: 'landing.featPinDesc' },
  { icon: Download, titleKey: 'landing.featExport', descKey: 'landing.featExportDesc' },
]

const CLINIC_FEATURES = [
  { icon: KeyRound, titleKey: 'landing.featClinicAccess', descKey: 'landing.featClinicAccessDesc' },
  { icon: Building2, titleKey: 'landing.featApi', descKey: 'landing.featApiDesc' },
  { icon: Activity, titleKey: 'landing.featDossier', descKey: 'landing.featDossierDesc' },
]

const STEPS = [
  { n: '1', titleKey: 'landing.step1', descKey: 'landing.step1Desc' },
  { n: '2', titleKey: 'landing.step2', descKey: 'landing.step2Desc' },
  { n: '3', titleKey: 'landing.step3', descKey: 'landing.step3Desc' },
]

export default function LandingPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const googleBtnRef = useRef(null)
  const [showOfficialButton, setShowOfficialButton] = useState(false)
  const isDark = theme === 'dark'

  function goAfterLogin() {
    const next = searchParams.get('next')
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      window.location.href = next
      return
    }
    window.location.href = '/dashboard'
  }

  useEffect(() => {
    if (getToken()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  function openLogin() {
    if (MAINTENANCE_MODE) {
      alert(t('landing.maintenanceLoginDenied'))
      return
    }
    // Official Google button lives in the modal (not the nav) — reliable + compact header.
    setShowOfficialButton(Boolean(GOOGLE_CLIENT_ID))
    setLoginOpen(true)
  }

  async function continueWithGoogle() {
    if (MAINTENANCE_MODE) {
      alert(t('landing.maintenanceLoginDenied'))
      return
    }

    if (GOOGLE_CLIENT_ID) {
      setShowOfficialButton(true)
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt()
      }
      return
    }

    const email = window.prompt('Dev login — email:') || 'demo@profipaws.com'
    setLoginLoading(true)
    try {
      await exchangeGoogleToken(`dev:${email}`)
      goAfterLogin()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoginLoading(false)
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
            setLoginLoading(true)
            if (!response?.credential) {
              throw new Error(t('landing.loginFailed'))
            }
            await exchangeGoogleToken(response.credential)
            goAfterLogin()
          } catch (e) {
            alert(e.message || t('landing.maintenanceLoginDenied'))
          } finally {
            setLoginLoading(false)
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
      })
      setGoogleReady(true)
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
  }, [t, searchParams])


  useEffect(() => {
    if (!loginOpen || !showOfficialButton || !googleReady) return undefined
    let cancelled = false
    const frame = window.requestAnimationFrame(() => {
      if (cancelled || !googleBtnRef.current || !window.google?.accounts?.id) return
      googleBtnRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320,
        logo_alignment: 'left',
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [loginOpen, showOfficialButton, googleReady, isDark])

  const muted = isDark ? 'text-cyan-100/80' : 'text-cyan-800/90'
  const soft = isDark ? 'text-cyan-100/70' : 'text-cyan-700/80'
  const heading = isDark ? 'text-white' : 'text-cyan-950'
  const sectionBg = isDark ? 'border-cyan-800/60 bg-cyan-950/40' : 'border-cyan-100 bg-white/70'

  return (
    <div
      className={`min-h-screen transition-colors ${
        isDark
          ? 'bg-hero-glow bg-cyan-950 text-white'
          : 'bg-gradient-to-br from-cyan-50 via-white to-teal-100 text-cyan-950'
      }`}
    >
      {MAINTENANCE_MODE && (
        <div
          className={`border-b px-4 py-2.5 text-center text-sm font-medium ${
            isDark
              ? 'border-amber-500/30 bg-amber-500/15 text-amber-100'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
          role="status"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Construction size={16} />
            {t('landing.maintenanceBanner')}
          </span>
        </div>
      )}

      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
        <div className={`flex items-center gap-2.5 font-display text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-cyan-900'}`}>
          <BrandLogo className="h-10 w-10" />
          Profipaws
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PreferenceControls variant={isDark ? 'landing' : 'app'} />
          {!MAINTENANCE_MODE && (
            <>
              <a href="#funciones" className={`hidden text-sm sm:inline ${isDark ? 'text-cyan-100/80 hover:text-white' : 'text-cyan-700 hover:text-cyan-900'}`}>
                {t('landing.navFeatures')}
              </a>
              <Link to="/pricing" className={`hidden text-sm sm:inline ${isDark ? 'text-cyan-100/80 hover:text-white' : 'text-cyan-700 hover:text-cyan-900'}`}>
                {t('nav.plans')}
              </Link>
            </>
          )}
          {!MAINTENANCE_MODE && (
            <button
              type="button"
              onClick={openLogin}
              className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition ${
                isDark
                  ? 'bg-white text-cyan-950 hover:bg-cyan-50'
                  : 'bg-cyan-700 text-white hover:bg-cyan-800'
              }`}
            >
              {t('nav.signIn')}
            </button>
          )}
        </div>
      </nav>

      <LoginModal
        open={loginOpen}
        onClose={() => !loginLoading && setLoginOpen(false)}
        onContinue={continueWithGoogle}
        loading={loginLoading || (Boolean(GOOGLE_CLIENT_ID) && !googleReady)}
        isDark={isDark}
        googleBtnRef={googleBtnRef}
        showOfficialButton={showOfficialButton}
      />

      {/* Hero — keep focused */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 lg:grid-cols-2 lg:pb-20 lg:pt-16">
        <div className="animate-fade-up">
          <p className={`mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}>
            {MAINTENANCE_MODE ? t('landing.maintenanceEyebrow') : t('landing.eyebrow')}
          </p>
          <h1 className={`font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl ${heading}`}>
            {t('landing.headline')}
          </h1>
          <p className={`mt-5 max-w-lg text-lg ${muted}`}>
            {MAINTENANCE_MODE ? t('landing.maintenanceSubtitle') : t('landing.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {MAINTENANCE_MODE ? (
              <div
                className={`inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold ${
                  isDark
                    ? 'border-cyan-400/30 bg-cyan-900/40 text-cyan-100'
                    : 'border-cyan-200 bg-white text-cyan-800'
                }`}
              >
                <Construction size={16} />
                {t('landing.maintenanceCta')}
              </div>
            ) : (
              <>
                <button type="button" onClick={openLogin} className="btn-primary gap-2 bg-cyan-500 hover:bg-cyan-400">
                  {t('landing.ctaStart')} <ArrowRight size={16} />
                </button>
                <Link
                  to="/pricing"
                  className={`btn-secondary ${isDark ? 'border-cyan-400/40 bg-transparent text-cyan-50 hover:bg-cyan-900/50' : ''}`}
                >
                  {t('landing.ctaPlans')}
                </Link>
              </>
            )}
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
            <div className="mb-2 flex items-center gap-3">
              <BrandLogo className="h-14 w-14 shadow-md shadow-cyan-900/30" />
              <span className={`font-display text-2xl font-bold tracking-tight ${heading}`}>
                Profipaws
              </span>
            </div>
            <Feature dark={isDark} icon={Shield} title={t('landing.featureClinical')} desc={t('landing.featureClinicalDesc')} />
            <Feature dark={isDark} icon={QrCode} title={t('landing.featureVet')} desc={t('landing.featureVetDesc')} />
            <Feature dark={isDark} icon={Building2} title={t('landing.featureB2b')} desc={t('landing.featureB2bDesc')} />
          </div>
        </div>
      </section>

      {/* Owners features */}
      <section id="funciones" className={`border-y ${sectionBg}`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={`font-display text-3xl font-bold tracking-tight sm:text-4xl ${heading}`}>
              {t('landing.ownersTitle')}
            </h2>
            <p className={`mt-3 text-base sm:text-lg ${soft}`}>{t('landing.ownersSubtitle')}</p>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OWNER_FEATURES.map(({ icon, titleKey, descKey }) => (
              <li key={titleKey}>
                <Feature dark={isDark} icon={icon} title={t(titleKey)} desc={t(descKey)} tall />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Clinics */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={`font-display text-3xl font-bold tracking-tight sm:text-4xl ${heading}`}>
            {t('landing.clinicsTitle')}
          </h2>
          <p className={`mt-3 text-base sm:text-lg ${soft}`}>{t('landing.clinicsSubtitle')}</p>
        </div>
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {CLINIC_FEATURES.map(({ icon, titleKey, descKey }) => (
            <li key={titleKey}>
              <Feature dark={isDark} icon={icon} title={t(titleKey)} desc={t(descKey)} tall />
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className={`border-y ${sectionBg}`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={`font-display text-3xl font-bold tracking-tight sm:text-4xl ${heading}`}>
              {t('landing.howTitle')}
            </h2>
            <p className={`mt-3 text-base sm:text-lg ${soft}`}>{t('landing.howSubtitle')}</p>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ n, titleKey, descKey }) => (
              <li
                key={n}
                className={`rounded-2xl border p-6 ${
                  isDark ? 'border-white/10 bg-white/5' : 'border-cyan-100 bg-cyan-50/80'
                }`}
              >
                <span className={`font-display text-3xl font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}>
                  {n}
                </span>
                <h3 className={`mt-3 font-display text-lg font-semibold ${heading}`}>{t(titleKey)}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${soft}`}>{t(descKey)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      {!MAINTENANCE_MODE && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div
            className={`relative overflow-hidden rounded-3xl border px-6 py-12 text-center sm:px-12 ${
              isDark
                ? 'border-cyan-400/20 bg-gradient-to-br from-cyan-800/50 to-teal-900/40'
                : 'border-cyan-200 bg-gradient-to-br from-white to-teal-50'
            }`}
          >
            <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-teal-400/15 blur-3xl" />
            <h2 className={`relative font-display text-3xl font-bold tracking-tight sm:text-4xl ${heading}`}>
              {t('landing.ctaBottomTitle')}
            </h2>
            <p className={`relative mx-auto mt-3 max-w-xl text-base sm:text-lg ${soft}`}>
              {t('landing.ctaBottomSubtitle')}
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={openLogin} className="btn-primary gap-2 bg-cyan-500 hover:bg-cyan-400">
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
        </section>
      )}

      <footer className={`border-t px-4 py-8 text-center text-sm ${isDark ? 'border-cyan-800/60 text-cyan-300/70' : 'border-cyan-100 text-cyan-600'}`}>
        © {new Date().getFullYear()} Profipaws
      </footer>
    </div>
  )
}

function Feature({ icon: Icon, title, desc, dark, tall = false }) {
  return (
    <div
      className={`flex gap-4 rounded-2xl border p-4 backdrop-blur-sm ${
        tall ? 'h-full' : ''
      } ${dark ? 'border-white/10 bg-white/5' : 'border-cyan-100 bg-cyan-50/80'}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${dark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
        <Icon size={20} />
      </span>
      <div>
        <h3 className={`font-display font-semibold ${dark ? 'text-white' : 'text-cyan-950'}`}>{title}</h3>
        <p className={`mt-1 text-sm leading-relaxed ${dark ? 'text-cyan-100/70' : 'text-cyan-700/80'}`}>{desc}</p>
      </div>
    </div>
  )
}

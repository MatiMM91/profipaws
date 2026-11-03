import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { exchangeGoogleToken, getStoredUser, isDemoUser } from '../auth'
import { createCheckoutSession, fetchSubscriptionTier, redirectToCheckout } from '../billing'
import LoginModal from './LoginModal'
import { useTheme } from '../theme/ThemeProvider'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function PricingSection({ variant = 'account', compact = false } = {}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [busy, setBusy] = useState(false)
  // null = still loading subscription for logged-in user
  const [tier, setTier] = useState(null) // null | guest | free | pro
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const [showOfficialButton, setShowOfficialButton] = useState(false)
  const googleBtnRef = useRef(null)

  const ready = tier !== null
  const isPro = tier === 'pro'
  const isPublic = variant === 'public'
  const cancelPath = isPublic ? '/planes' : '/pricing'

  async function loadSubscription() {
    setTier(await fetchSubscriptionTier())
  }

  useEffect(() => {
    loadSubscription()
  }, [])

  useEffect(() => {
    if (!loginOpen || !GOOGLE_CLIENT_ID) return undefined

    let cancelled = false

    const renderOfficialButton = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return
      googleBtnRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320,
      })
    }

    const initGoogle = () => {
      if (!window.google?.accounts?.id || cancelled) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            setLoginLoading(true)
            if (!response?.credential) {
              throw new Error(t('landing.loginFailed'))
            }
            await exchangeGoogleToken(response.credential)
            setLoginOpen(false)
            await redirectToCheckout({ cancelPath })
          } catch (e) {
            alert(e.message || t('landing.loginFailed'))
          } finally {
            setLoginLoading(false)
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
      })
      setGoogleReady(true)
      renderOfficialButton()
    }

    if (window.google?.accounts?.id) {
      initGoogle()
      return () => {
        cancelled = true
      }
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initGoogle
    document.body.appendChild(script)
    return () => {
      cancelled = true
      script.remove()
    }
  }, [loginOpen, isDark, t, cancelPath])

  useEffect(() => {
    if (!loginOpen || !showOfficialButton || !googleReady) return
    if (!window.google?.accounts?.id || !googleBtnRef.current) return
    googleBtnRef.current.innerHTML = ''
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: isDark ? 'filled_black' : 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 320,
    })
  }, [loginOpen, showOfficialButton, googleReady, isDark])

  async function startCheckout() {
    const token = localStorage.getItem('profipaws_token')
    if (!token) {
      setShowOfficialButton(Boolean(GOOGLE_CLIENT_ID))
      setLoginOpen(true)
      return
    }
    if (isDemoUser(getStoredUser())) {
      alert(t('pricing.demoBlocked'))
      return
    }
    setBusy(true)
    try {
      const url = await createCheckoutSession({ cancelPath })
      window.location.href = url
    } catch (e) {
      alert(e?.message || t('pricing.stripeMissing'))
    } finally {
      setBusy(false)
    }
  }

  async function continueWithGoogle() {
    if (GOOGLE_CLIENT_ID) {
      setShowOfficialButton(true)
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt()
      }
      return
    }
    const email = window.prompt('Dev login — email:') || 'buyer@profipaws.com'
    setLoginLoading(true)
    try {
      await exchangeGoogleToken(`dev:${email}`)
      setLoginOpen(false)
      await redirectToCheckout({ cancelPath })
    } catch (e) {
      alert(e.message)
    } finally {
      setLoginLoading(false)
    }
  }

  const demoFeatures = t('pricing.demoFeatures', { returnObjects: true }) || []
  const fullFeatures = t('pricing.fullFeatures', { returnObjects: true }) || []
  const shownDemo = compact ? demoFeatures.slice(0, 3) : demoFeatures
  const shownFull = compact ? fullFeatures.slice(0, 5) : fullFeatures

  return (
    <div className={`w-full ${compact ? 'space-y-4' : 'space-y-10'}`}>
      <LoginModal
        open={loginOpen}
        onClose={() => !loginLoading && setLoginOpen(false)}
        onContinue={continueWithGoogle}
        loading={loginLoading || (Boolean(GOOGLE_CLIENT_ID) && !googleReady)}
        isDark={isDark}
        googleBtnRef={googleBtnRef}
        showOfficialButton={showOfficialButton}
        variant="checkout"
      />

      <div className="text-center">
        <h1
          className={`font-display font-bold text-cyan-950 dark:text-cyan-50 ${
            compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
          }`}
        >
          {isPublic ? t('pricing.publicTitle') : t('pricing.accountTitle')}
        </h1>
        <p
          className={`mx-auto max-w-xl text-cyan-700/80 dark:text-cyan-300/80 ${
            compact ? 'mt-1.5 text-sm' : 'mt-3'
          }`}
        >
          {isPublic ? t('pricing.publicSubtitle') : t('pricing.accountSubtitle')}
        </p>
      </div>

      <div className={`mx-auto grid max-w-3xl md:grid-cols-2 ${compact ? 'gap-3' : 'gap-6'}`}>
        <article
          className={`rounded-2xl border border-cyan-100 bg-white text-cyan-950 dark:border-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-50 ${
            compact ? 'p-4 sm:p-5' : 'p-7'
          }`}
        >
          <h2 className={`font-display font-bold ${compact ? 'text-xl' : 'text-2xl'}`}>
            {t('pricing.demoTitle')}
          </h2>
          <p className={compact ? 'mt-1' : 'mt-2'}>
            <span className={`font-bold ${compact ? 'text-3xl' : 'text-4xl'}`}>{t('pricing.demoPrice')}</span>
            <span className="text-cyan-600 dark:text-cyan-300"> {t('pricing.demoPeriod')}</span>
          </p>
          <p className={`text-cyan-600 dark:text-cyan-400 ${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'}`}>
            {t('pricing.demoNote')}
          </p>
          <ul className={compact ? 'mt-3 space-y-1.5' : 'mt-6 space-y-3'}>
            {shownDemo.map((f) => (
              <li key={f} className={`flex items-start gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                <Check size={compact ? 14 : 16} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-300" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            to="/?demo=1"
            className={`block w-full rounded-lg border border-cyan-200 text-center font-semibold text-cyan-800 transition hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-100 dark:hover:bg-cyan-950/60 ${
              compact ? 'mt-4 px-3 py-2 text-xs' : 'mt-8 px-4 py-2.5 text-sm'
            }`}
          >
            {t('pricing.tryDemo')}
          </Link>
        </article>

        <article
          className={`rounded-2xl border bg-gradient-to-b from-cyan-600 to-cyan-800 text-white shadow-lg shadow-cyan-900/20 ${
            isPro ? 'border-white ring-2 ring-white/50' : 'border-cyan-500'
          } ${compact ? 'p-4 sm:p-5' : 'p-7'}`}
        >
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-cyan-400/20 font-semibold text-cyan-100 ${
              compact ? 'mb-2 px-2.5 py-0.5 text-[10px]' : 'mb-3 px-3 py-1 text-xs'
            }`}
          >
            {isPro ? (
              t('pricing.yourAccess')
            ) : (
              <>
                <Sparkles size={12} /> {t('pricing.recommended')}
              </>
            )}
          </span>
          <h2 className={`font-display font-bold ${compact ? 'text-xl' : 'text-2xl'}`}>
            {t('pricing.fullAccess')}
          </h2>
          <p className={compact ? 'mt-1' : 'mt-2'}>
            <span className={`font-bold ${compact ? 'text-3xl' : 'text-4xl'}`}>{t('pricing.fullPrice')}</span>
            <span className="text-cyan-100/80"> {t('pricing.once')}</span>
          </p>
          <p className={`text-cyan-100/85 ${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'}`}>
            {t('pricing.fullNote')}
          </p>
          <ul className={compact ? 'mt-3 space-y-1.5' : 'mt-6 space-y-3'}>
            {shownFull.map((f) => (
              <li key={f} className={`flex items-start gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                <Check size={compact ? 14 : 16} className="mt-0.5 shrink-0 text-cyan-200" />
                {f}
              </li>
            ))}
          </ul>

          {!ready ? (
            <div
              className={`w-full rounded-lg border border-white/30 bg-white/10 text-center font-semibold text-cyan-100/90 ${
                compact ? 'mt-4 px-3 py-2 text-xs' : 'mt-8 px-4 py-2.5 text-sm'
              }`}
            >
              {t('pricing.loadingPlan')}
            </div>
          ) : isPro ? (
            <div
              className={`w-full rounded-lg border border-white/40 bg-white/15 text-center font-semibold text-white ${
                compact ? 'mt-4 px-3 py-2 text-xs' : 'mt-8 px-4 py-2.5 text-sm'
              }`}
            >
              {t('pricing.alreadyUnlocked')}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={startCheckout}
                disabled={busy}
                className={`w-full rounded-lg bg-white font-semibold text-cyan-800 transition hover:bg-cyan-50 disabled:opacity-60 ${
                  compact ? 'mt-4 px-3 py-2 text-xs' : 'mt-8 px-4 py-2.5 text-sm'
                }`}
              >
                {busy ? t('pricing.redirecting') : t('pricing.buyOnce')}
              </button>
              <p className={`text-center text-cyan-100/70 ${compact ? 'mt-2 text-[10px]' : 'mt-3 text-xs'}`}>
                {t('pricing.payOnceHint')}
              </p>
            </>
          )}
        </article>
      </div>

      {!compact && (
        <p className="mx-auto max-w-2xl text-center text-xs text-cyan-600 dark:text-cyan-400">
          {t('pricing.vatNote')}
        </p>
      )}
    </div>
  )
}

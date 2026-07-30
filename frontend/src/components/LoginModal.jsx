import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import BrandLogo from './BrandLogo'

function GoogleMark({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export default function LoginModal({
  open,
  onClose,
  onContinue,
  loading = false,
  isDark = false,
  googleBtnRef = null,
  showOfficialButton = false,
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-cyan-950/55 backdrop-blur-sm"
        aria-label={t('common.cancel')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${
          isDark
            ? 'border-cyan-700/50 bg-cyan-950 text-cyan-50 shadow-cyan-950/60'
            : 'border-cyan-100 bg-white text-cyan-950 shadow-cyan-900/15'
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${
            isDark ? 'bg-cyan-400/20' : 'bg-teal-300/40'
          }`}
        />
        <div
          className={`pointer-events-none absolute -bottom-20 -left-10 h-36 w-36 rounded-full blur-3xl ${
            isDark ? 'bg-teal-500/15' : 'bg-cyan-200/50'
          }`}
        />

        <div className="relative px-6 pb-7 pt-5 sm:px-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-11 w-11 shadow-md shadow-cyan-900/20" />
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}>
                  Profipaws
                </p>
                <h2 id={titleId} className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  {t('landing.loginTitle')}
                </h2>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                isDark
                  ? 'text-cyan-200 hover:bg-white/10 hover:text-white'
                  : 'text-cyan-700 hover:bg-cyan-50 hover:text-cyan-950'
              }`}
              aria-label={t('common.cancel')}
            >
              <X size={18} />
            </button>
          </div>

          <p className={`mt-4 text-sm leading-relaxed ${isDark ? 'text-cyan-100/75' : 'text-cyan-700/85'}`}>
            {t('landing.loginSubtitle')}
          </p>

          {showOfficialButton ? (
            <div className="mt-7 flex min-h-[48px] flex-col items-center justify-center gap-2">
              <div ref={googleBtnRef} />
              {loading ? (
                <p className={`text-xs ${isDark ? 'text-cyan-200/60' : 'text-cyan-600/70'}`}>
                  {t('landing.loginWorking')}
                </p>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={onContinue}
              disabled={loading}
              className={`mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${
                isDark
                  ? 'border-white/15 bg-white text-cyan-950 hover:bg-cyan-50 focus:ring-offset-cyan-950'
                  : 'border-cyan-200/80 bg-white text-cyan-950 hover:bg-cyan-50 focus:ring-offset-white'
              }`}
            >
              <GoogleMark />
              {loading ? t('landing.loginWorking') : t('landing.continueGoogle')}
            </button>
          )}

          <p className={`mt-4 text-center text-xs leading-relaxed ${isDark ? 'text-cyan-200/55' : 'text-cyan-600/80'}`}>
            {t('landing.loginSecure')}
          </p>
        </div>
      </div>
    </div>
  )
}

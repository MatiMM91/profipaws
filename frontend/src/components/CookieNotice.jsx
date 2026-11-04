import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../theme/ThemeProvider'

const STORAGE_KEY = 'profipaws_cookie_notice'

export default function CookieNotice() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('legal.cookieBannerTitle')}
      className={`fixed inset-x-0 bottom-0 z-50 border-t p-4 shadow-lg sm:p-5 ${
        isDark
          ? 'border-cyan-700/50 bg-cyan-950/95 text-cyan-50 backdrop-blur-md'
          : 'border-cyan-100 bg-white/95 text-cyan-950 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="font-display font-semibold">{t('legal.cookieBannerTitle')}</p>
          <p className={`mt-1 ${isDark ? 'text-cyan-100/80' : 'text-cyan-800/90'}`}>
            {t('legal.cookieBannerBody')}{' '}
            <Link to="/legal/cookies" className="font-medium underline underline-offset-2">
              {t('legal.cookieMore')}
            </Link>
          </p>
        </div>
        <button type="button" onClick={accept} className="btn-primary shrink-0 self-stretch sm:self-center">
          {t('legal.cookieAccept')}
        </button>
      </div>
    </div>
  )
}

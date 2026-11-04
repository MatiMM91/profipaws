import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../theme/ThemeProvider'

const LINKS = [
  { to: '/legal/terms', key: 'legal.footerTerms' },
  { to: '/legal/privacy', key: 'legal.footerPrivacy' },
  { to: '/legal/cookies', key: 'legal.footerCookies' },
  { to: '/legal/notice', key: 'legal.footerNotice' },
  { to: '/legal/refunds', key: 'legal.footerRefunds' },
]

export default function SiteFooter({ className = '' }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <footer
      className={`border-t px-4 py-8 text-center text-sm ${
        isDark ? 'border-cyan-800/60 text-cyan-300/70' : 'border-cyan-100 text-cyan-600'
      } ${className}`}
    >
      <p className="font-medium">© {new Date().getFullYear()} Profipaws</p>
      <nav
        className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2"
        aria-label={t('legal.footerNav')}
      >
        {LINKS.map(({ to, key }) => (
          <Link
            key={to}
            to={to}
            className={`underline-offset-2 hover:underline ${
              isDark ? 'text-cyan-200/90 hover:text-white' : 'text-cyan-700 hover:text-cyan-950'
            }`}
          >
            {t(key)}
          </Link>
        ))}
      </nav>
      <p className={`mt-3 text-xs ${isDark ? 'text-cyan-400/60' : 'text-cyan-500'}`}>
        {t('legal.contact')}
      </p>
    </footer>
  )
}

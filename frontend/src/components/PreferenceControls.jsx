import { useTranslation } from 'react-i18next'
import { Moon, Sun, Languages } from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider'

export default function PreferenceControls({ variant = 'app' }) {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  const btn =
    variant === 'landing'
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-cyan-50 transition hover:bg-white/10'
      : 'inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-2.5 py-1.5 text-xs font-medium text-cyan-800 transition hover:bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-100 dark:hover:bg-cyan-900'

  const lang = i18n.language?.startsWith('en') ? 'en' : 'es'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={btn}
        onClick={() => i18n.changeLanguage(lang === 'es' ? 'en' : 'es')}
        aria-label={t('nav.language')}
        title={t('nav.language')}
      >
        <Languages size={14} />
        {lang === 'es' ? 'ES' : 'EN'}
      </button>
      <button
        type="button"
        className={btn}
        onClick={toggleTheme}
        aria-label={t('nav.theme')}
        title={theme === 'dark' ? t('nav.light') : t('nav.dark')}
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        {theme === 'dark' ? t('nav.light') : t('nav.dark')}
      </button>
    </div>
  )
}

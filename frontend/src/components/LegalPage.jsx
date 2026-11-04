import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import BrandLogo from './BrandLogo'
import PreferenceControls from './PreferenceControls'
import SiteFooter from './SiteFooter'
import { useTheme } from '../theme/ThemeProvider'

const DOCS = ['terms', 'privacy', 'cookies', 'notice', 'refunds']

export default function LegalPage() {
  const { doc } = useParams()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!DOCS.includes(doc)) {
    return <Navigate to="/legal/terms" replace />
  }

  const base = `legal.${doc}`
  const sections = t(`${base}.sections`, { returnObjects: true })
  const sectionList = Array.isArray(sections) ? sections : []

  const heading = isDark ? 'text-white' : 'text-cyan-950'
  const soft = isDark ? 'text-cyan-100/75' : 'text-cyan-800/85'
  const card = isDark
    ? 'border-white/10 bg-white/5'
    : 'border-cyan-100 bg-white/80'

  return (
    <div
      className={`flex min-h-[100dvh] flex-col transition-colors ${
        isDark
          ? 'bg-hero-glow bg-cyan-950 text-white'
          : 'bg-gradient-to-br from-cyan-50 via-white to-teal-100 text-cyan-950'
      }`}
    >
      <nav className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link
          to="/"
          className={`flex items-center gap-2 font-display text-lg font-bold tracking-tight ${heading}`}
        >
          <BrandLogo className="h-8 w-8" />
          Profipaws
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${
              isDark ? 'text-cyan-100/80 hover:text-white' : 'text-cyan-700 hover:text-cyan-900'
            }`}
          >
            <ArrowLeft size={15} />
            {t('legal.back')}
          </Link>
          <PreferenceControls variant={isDark ? 'landing' : 'app'} />
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <p className={`text-xs font-medium uppercase tracking-wide ${soft}`}>{t('legal.updated')}</p>
        <h1 className={`mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl ${heading}`}>
          {t(`${base}.title`)}
        </h1>
        <p className={`mt-4 text-base leading-relaxed ${soft}`}>{t(`${base}.intro`)}</p>

        <div className="mt-8 space-y-6">
          {sectionList.map((section) => (
            <section key={section.title} className={`rounded-2xl border p-5 sm:p-6 ${card}`}>
              <h2 className={`font-display text-lg font-semibold ${heading}`}>{section.title}</h2>
              <div className={`mt-3 space-y-3 text-sm leading-relaxed sm:text-[15px] ${soft}`}>
                {(section.paragraphs || []).map((p) => (
                  <p key={p.slice(0, 48)}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className={`mt-8 text-sm ${soft}`}>{t('legal.contact')}</p>
      </main>

      <SiteFooter />
    </div>
  )
}

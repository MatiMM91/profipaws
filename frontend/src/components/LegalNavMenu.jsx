import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Scale } from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider'

const LINKS = [
  { to: '/legal/terms', key: 'legal.footerTerms' },
  { to: '/legal/privacy', key: 'legal.footerPrivacy' },
  { to: '/legal/cookies', key: 'legal.footerCookies' },
  { to: '/legal/notice', key: 'legal.footerNotice' },
  { to: '/legal/refunds', key: 'legal.footerRefunds' },
]

export default function LegalNavMenu({ variant = 'app' }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()
  const isDark = theme === 'dark' || variant === 'landing'

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const trigger =
    variant === 'landing'
      ? 'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition text-cyan-100/80 hover:text-white'
      : 'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition nav-link'

  const panel = isDark
    ? 'border-cyan-700/50 bg-cyan-950/95 text-cyan-50 shadow-xl backdrop-blur-md'
    : 'border-cyan-100 bg-white text-cyan-950 shadow-xl'

  const item = (active) =>
    isDark
      ? `block rounded-lg px-3 py-2 text-sm transition ${
          active ? 'bg-white/15 text-white' : 'text-cyan-100/90 hover:bg-white/10 hover:text-white'
        }`
      : `block rounded-lg px-3 py-2 text-sm transition ${
          active ? 'bg-cyan-50 text-cyan-950' : 'text-cyan-800 hover:bg-cyan-50 hover:text-cyan-950'
        }`

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <Scale size={15} />
        <span className="hidden sm:inline">{t('nav.legal')}</span>
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute right-0 z-40 mt-2 w-52 rounded-xl border p-1.5 ${panel}`}
        >
          {LINKS.map(({ to, key }) => (
            <Link key={to} to={to} role="menuitem" className={item(pathname === to)} onClick={() => setOpen(false)}>
              {t(key)}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

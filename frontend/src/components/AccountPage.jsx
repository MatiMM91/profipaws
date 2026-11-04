import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { deleteAccount, getStoredUser, isDemoUser } from '../auth'

export default function AccountPage() {
  const { t } = useTranslation()
  const user = getStoredUser()
  const email = String(user?.email || '').trim()
  const demo = isDemoUser()
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canDelete = useMemo(() => {
    if (demo || !email) return false
    return confirmText.trim().toLowerCase() === email.toLowerCase()
  }, [confirmText, demo, email])

  async function removeAccount(event) {
    event.preventDefault()
    if (!canDelete || busy) return
    setError('')
    setBusy(true)
    try {
      await deleteAccount()
      window.location.href = '/'
    } catch (e) {
      setError(e.message || t('account.deleteError'))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-700 hover:text-cyan-950 dark:text-cyan-200/80 dark:hover:text-white"
      >
        <ArrowLeft size={15} />
        {t('account.back')}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-cyan-950 dark:text-white">
        {t('account.title')}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-cyan-800/80 dark:text-cyan-100/70">
        {t('account.subtitle')}
      </p>

      {email && (
        <div className="mt-6 rounded-2xl border border-cyan-100 bg-white/80 px-5 py-4 dark:border-cyan-800/60 dark:bg-cyan-950/40">
          <p className="text-xs font-medium uppercase tracking-wide text-cyan-600 dark:text-cyan-300/70">
            {t('account.signedInAs')}
          </p>
          <p className="mt-1 font-medium text-cyan-950 dark:text-cyan-50">{email}</p>
        </div>
      )}

      {demo ? (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-50">
          {t('account.demoBlocked')}
        </div>
      ) : (
        <section
          className="mt-8 rounded-2xl border border-red-300/80 bg-red-50/80 p-5 dark:border-red-500/40 dark:bg-red-950/30 sm:p-6"
          aria-labelledby="danger-zone-title"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
              <AlertTriangle size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="danger-zone-title" className="font-display text-lg font-semibold text-red-800 dark:text-red-200">
                {t('account.dangerTitle')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-red-900/85 dark:text-red-100/80">
                {t('account.dangerBody')}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-900/80 dark:text-red-100/75">
                <li>{t('account.dangerItemPets')}</li>
                <li>{t('account.dangerItemHistory')}</li>
                <li>{t('account.dangerItemAccess')}</li>
              </ul>

              <form className="mt-5 space-y-3" onSubmit={removeAccount}>
                <label className="block text-sm font-medium text-red-900 dark:text-red-100">
                  {t('account.confirmLabel', { email })}
                  <input
                    type="email"
                    autoComplete="off"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={email}
                    className="mt-1.5 w-full rounded-xl border border-red-300 bg-white px-3 py-2.5 text-sm text-cyan-950 outline-none ring-red-400/40 placeholder:text-red-300 focus:ring-2 dark:border-red-500/40 dark:bg-cyan-950 dark:text-cyan-50 dark:placeholder:text-red-300/40"
                  />
                </label>
                {error && (
                  <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!canDelete || busy}
                  className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? t('account.deleting') : t('account.deleteButton')}
                </button>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

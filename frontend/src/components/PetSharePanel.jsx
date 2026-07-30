import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Share2, Trash2, Users } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function PetSharePanel({ petId, embedded = false, variant = 'panel' }) {
  const { t } = useTranslation()
  const [shares, setShares] = useState([])
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('read')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  async function loadShares() {
    const res = await fetch(`${API_URL}/api/pets/${petId}/shares`, { headers: authHeaders() })
    if (res.ok) setShares(await res.json())
  }

  useEffect(() => {
    loadShares()
  }, [petId])

  async function addShare(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch(`${API_URL}/api/pets/${petId}/shares`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email: email.trim(), permission }),
    })
    setBusy(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(typeof err.detail === 'string' ? err.detail : t('share.error'))
      return
    }
    setEmail('')
    setPermission('read')
    await loadShares()
  }

  async function updatePermission(shareId, next) {
    const res = await fetch(`${API_URL}/api/pets/${petId}/shares/${shareId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ permission: next }),
    })
    if (res.ok) await loadShares()
  }

  async function removeShare(shareId) {
    if (!confirm(t('share.removeConfirm'))) return
    const res = await fetch(`${API_URL}/api/pets/${petId}/shares/${shareId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (res.ok) setShares((prev) => prev.filter((s) => s.id !== shareId))
  }

  const shareBody = open && (
    <div className="mt-3 space-y-3 border-t border-cyan-100/80 pt-3 dark:border-cyan-800/80">
      <form onSubmit={addShare} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="email"
          className="field px-3 py-2 text-sm"
          placeholder={t('share.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select
          className="field px-3 py-2 text-sm"
          value={permission}
          onChange={(e) => setPermission(e.target.value)}
        >
          <option value="read">{t('share.canRead')}</option>
          <option value="edit">{t('share.canEdit')}</option>
        </select>
        <button type="submit" className="btn-primary text-sm" disabled={busy}>
          {busy ? t('share.sharing') : t('share.add')}
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {shares.length === 0 ? (
        <p className="text-xs text-cyan-600 dark:text-cyan-400">{t('share.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {shares.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-100 px-3 py-2 text-sm dark:border-cyan-800"
            >
              <span className="inline-flex min-w-0 items-center gap-2 text-cyan-900 dark:text-cyan-100">
                <Users size={14} className="shrink-0 text-cyan-500" />
                <span className="truncate">
                  <span className="font-medium">{s.full_name || s.email}</span>
                  {s.full_name && (
                    <span className="ml-1 text-xs text-cyan-600 dark:text-cyan-400">{s.email}</span>
                  )}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <select
                  className="field px-2 py-1 text-xs"
                  value={s.permission}
                  onChange={(e) => updatePermission(s.id, e.target.value)}
                >
                  <option value="read">{t('share.canRead')}</option>
                  <option value="edit">{t('share.canEdit')}</option>
                </select>
                <button
                  type="button"
                  className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  onClick={() => removeShare(s.id)}
                  aria-label={t('share.remove')}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  if (variant === 'tool') {
    return (
      <div className="rounded-lg border border-cyan-100/90 bg-white/80 p-3 dark:border-cyan-800 dark:bg-cyan-950/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
              <Share2 size={16} />
            </span>
            <div className="min-w-0">
              <p className="inline-flex flex-wrap items-center gap-2 text-sm font-medium text-cyan-950 dark:text-cyan-50">
                {t('share.title')}
                {shares.length > 0 && (
                  <span className="rounded-md bg-cyan-100 px-1.5 py-0.5 text-[10px] font-medium text-cyan-800 dark:bg-cyan-800 dark:text-cyan-100">
                    {shares.length}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-cyan-600 dark:text-cyan-400">{t('share.hint')}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary shrink-0 px-3 py-1.5 text-xs sm:self-center"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t('share.close') : t('share.action')}
          </button>
        </div>
        {shareBody}
      </div>
    )
  }

  return (
    <div className={embedded ? 'mt-3 border-t border-cyan-100 pt-3 dark:border-cyan-800' : 'mt-5 rounded-xl border border-cyan-100 bg-white/70 p-4 dark:border-cyan-800 dark:bg-cyan-950/30'}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-900 dark:text-cyan-100"
        onClick={() => setOpen((v) => !v)}
      >
        <Share2 size={14} />
        {t('share.title')}
        {shares.length > 0 && (
          <span className="rounded-md bg-cyan-100 px-1.5 py-0.5 text-[10px] font-medium text-cyan-800 dark:bg-cyan-800 dark:text-cyan-100">
            {shares.length}
          </span>
        )}
      </button>
      <p className="mt-1 text-xs text-cyan-600 dark:text-cyan-400">{t('share.hint')}</p>
      {shareBody}
    </div>
  )
}

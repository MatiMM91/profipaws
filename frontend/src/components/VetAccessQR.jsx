import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, QrCode, KeyRound, Clock } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function VetAccessQR() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const [access, setAccess] = useState(null)
  const [loading, setLoading] = useState(false)

  async function generatePin() {
    setLoading(true)
    try {
      const token = localStorage.getItem('profipaws_token')
      const res = await fetch(`${API_URL}/api/pets/${id}/access-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        alert(t('vet.error'))
        return
      }
      setAccess(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const qrUrl = access
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(access.qr_payload)}`
    : null

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link to={`/pets/${id}`} className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-cyan-100">
        <ArrowLeft size={14} /> {t('vet.back')}
      </Link>

      <div className="surface p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-100">
          <QrCode size={28} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-cyan-950 dark:text-cyan-50">
          {t('vet.title')}
        </h1>
        <p className="mt-2 text-sm text-cyan-700/80 dark:text-cyan-300/80">
          {t('vet.subtitle')}
        </p>

        {!access ? (
          <button type="button" className="btn-primary mt-6" onClick={generatePin} disabled={loading}>
            <KeyRound size={16} />
            {loading ? t('vet.generating') : t('vet.generate')}
          </button>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="font-display text-5xl font-bold tracking-[0.35em] text-cyan-800 dark:text-cyan-200">
              {access.pin}
            </p>
            {qrUrl && (
              <img
                src={qrUrl}
                alt="QR"
                className="mx-auto rounded-xl border border-cyan-100 dark:border-cyan-800"
                width={220}
                height={220}
              />
            )}
            <p className="inline-flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400">
              <Clock size={12} />
              {t('vet.expires')}: {new Date(access.expires_at).toLocaleString(i18n.language)}
            </p>
            <button type="button" className="btn-secondary" onClick={generatePin}>
              {t('vet.regenerate')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

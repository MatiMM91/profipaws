import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, QrCode, KeyRound, Clock } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function VetAccessQR() {
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
        alert('No se pudo generar el PIN')
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
      <Link to={`/pets/${id}`} className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900">
        <ArrowLeft size={14} /> Volver al perfil
      </Link>

      <div className="rounded-2xl border border-cyan-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
          <QrCode size={28} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-cyan-950">
          Acceso veterinario
        </h1>
        <p className="mt-2 text-sm text-cyan-700/80">
          Genera un PIN de 6 dígitos o muestra el QR al veterinario. Caduca en 2 horas y no requiere cuenta.
        </p>

        {!access ? (
          <button type="button" className="btn-primary mt-6" onClick={generatePin} disabled={loading}>
            <KeyRound size={16} />
            {loading ? 'Generando…' : 'Generar PIN / QR'}
          </button>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="font-display text-5xl font-bold tracking-[0.35em] text-cyan-800">
              {access.pin}
            </p>
            {qrUrl && (
              <img
                src={qrUrl}
                alt="QR de acceso veterinario"
                className="mx-auto rounded-xl border border-cyan-100"
                width={220}
                height={220}
              />
            )}
            <p className="inline-flex items-center gap-1.5 text-xs text-cyan-600">
              <Clock size={12} />
              Expira: {new Date(access.expires_at).toLocaleString()}
            </p>
            <button type="button" className="btn-secondary" onClick={generatePin}>
              Regenerar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

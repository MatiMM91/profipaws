import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, NotebookPen } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function MedicalLog() {
  const { id } = useParams()
  const [logs, setLogs] = useState([])
  const [note, setNote] = useState('')
  const [mood, setMood] = useState('')
  const [appetite, setAppetite] = useState('')

  async function loadLogs() {
    const res = await fetch(`${API_URL}/api/pets/${id}/logs`, { headers: authHeaders() })
    if (res.ok) setLogs(await res.json())
  }

  useEffect(() => {
    loadLogs()
  }, [id])

  async function submitLog(e) {
    e.preventDefault()
    const res = await fetch(`${API_URL}/api/pets/${id}/logs`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ note, mood: mood || null, appetite: appetite || null }),
    })
    if (!res.ok) {
      alert('No se pudo guardar la nota')
      return
    }
    setNote('')
    setMood('')
    setAppetite('')
    await loadLogs()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to={`/pets/${id}`} className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900">
        <ArrowLeft size={14} /> Volver al perfil
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-cyan-950">Diario de seguimiento</h1>
        <p className="mt-1 text-sm text-cyan-700/80">
          Notas rápidas para mostrar al veterinario: apetito, síntomas, comportamiento…
        </p>
      </div>

      <form onSubmit={submitLog} className="space-y-3 rounded-2xl border border-cyan-100 bg-white p-5">
        <textarea
          className="w-full rounded-lg border border-cyan-200 px-3 py-2 text-sm"
          rows={3}
          placeholder='Ej: "Comió bien", "Tos leve por la noche"…'
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
            placeholder="Ánimo (opcional)"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
          />
          <input
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
            placeholder="Apetito (opcional)"
            value={appetite}
            onChange={(e) => setAppetite(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">
          <NotebookPen size={16} /> Guardar nota
        </button>
      </form>

      <ul className="space-y-3">
        {logs.map((log) => (
          <li key={log.id} className="rounded-xl border border-cyan-100 bg-white px-4 py-3">
            <p className="text-sm text-cyan-950">{log.note}</p>
            <p className="mt-1 text-xs text-cyan-600">
              {new Date(log.logged_at).toLocaleString()}
              {log.mood ? ` · ánimo: ${log.mood}` : ''}
              {log.appetite ? ` · apetito: ${log.appetite}` : ''}
            </p>
          </li>
        ))}
        {logs.length === 0 && (
          <li className="text-center text-sm text-cyan-600">Sin entradas todavía.</li>
        )}
      </ul>
    </div>
  )
}

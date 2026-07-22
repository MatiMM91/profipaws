import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, NotebookPen, Pencil, Trash2, Check, X } from 'lucide-react'

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
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ note: '', mood: '', appetite: '' })

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

  async function saveLog(logId) {
    const res = await fetch(`${API_URL}/api/pets/${id}/logs/${logId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        note: editForm.note,
        mood: editForm.mood || null,
        appetite: editForm.appetite || null,
      }),
    })
    if (!res.ok) {
      alert('No se pudo actualizar la nota')
      return
    }
    setEditingId(null)
    await loadLogs()
  }

  async function deleteLog(logId) {
    if (!confirm('¿Borrar esta nota del diario?')) return
    const res = await fetch(`${API_URL}/api/pets/${id}/logs/${logId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      alert('No se pudo borrar')
      return
    }
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
            {editingId === log.id ? (
              <div className="space-y-2">
                <textarea
                  className="w-full rounded-lg border border-cyan-200 px-3 py-2 text-sm"
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
                    placeholder="Ánimo"
                    value={editForm.mood}
                    onChange={(e) => setEditForm({ ...editForm, mood: e.target.value })}
                  />
                  <input
                    className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
                    placeholder="Apetito"
                    value={editForm.appetite}
                    onChange={(e) => setEditForm({ ...editForm, appetite: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary text-xs" onClick={() => saveLog(log.id)}>
                    <Check size={12} /> Guardar
                  </button>
                  <button type="button" className="btn-secondary text-xs" onClick={() => setEditingId(null)}>
                    <X size={12} /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-cyan-950">{log.note}</p>
                  <p className="mt-1 text-xs text-cyan-600">
                    {new Date(log.logged_at).toLocaleString()}
                    {log.mood ? ` · ánimo: ${log.mood}` : ''}
                    {log.appetite ? ` · apetito: ${log.appetite}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800"
                    onClick={() => {
                      setEditingId(log.id)
                      setEditForm({
                        note: log.note,
                        mood: log.mood || '',
                        appetite: log.appetite || '',
                      })
                    }}
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700"
                    onClick={() => deleteLog(log.id)}
                  >
                    <Trash2 size={12} /> Borrar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {logs.length === 0 && (
          <li className="text-center text-sm text-cyan-600">Sin entradas todavía.</li>
        )}
      </ul>
    </div>
  )
}

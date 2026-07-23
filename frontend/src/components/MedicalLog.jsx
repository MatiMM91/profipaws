import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation()
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
    if (!confirm(t('log.deleteConfirm'))) return
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
      <Link to={`/pets/${id}`} className="inline-flex items-center gap-1 text-sm text-cyan-700 dark:text-cyan-300 hover:text-cyan-900">
        <ArrowLeft size={14} /> {t('log.back')}
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-cyan-950 dark:text-cyan-50">{t('log.title')}</h1>
        <p className="mt-1 text-sm text-cyan-700 dark:text-cyan-300/80">
          {t('log.subtitle')}
        </p>
      </div>

      <form onSubmit={submitLog} className="space-y-3 surface p-5">
        <textarea
          className="w-full field px-3 py-2 text-sm"
          rows={3}
          placeholder={t('log.placeholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="field px-3 py-2 text-sm"
            placeholder={t('log.mood')}
            value={mood}
            onChange={(e) => setMood(e.target.value)}
          />
          <input
            className="field px-3 py-2 text-sm"
            placeholder={t('log.appetite')}
            value={appetite}
            onChange={(e) => setAppetite(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">
          <NotebookPen size={16} /> {t('log.save')}
        </button>
      </form>

      <ul className="space-y-3">
        {logs.map((log) => (
          <li key={log.id} className="rounded-xl border border-cyan-100 bg-white px-4 py-3 dark:border-cyan-800 dark:bg-cyan-900/40">
            {editingId === log.id ? (
              <div className="space-y-2">
                <textarea
                  className="w-full field px-3 py-2 text-sm"
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="field px-3 py-2 text-sm"
                    placeholder={t('log.mood')}
                    value={editForm.mood}
                    onChange={(e) => setEditForm({ ...editForm, mood: e.target.value })}
                  />
                  <input
                    className="field px-3 py-2 text-sm"
                    placeholder={t('log.appetite')}
                    value={editForm.appetite}
                    onChange={(e) => setEditForm({ ...editForm, appetite: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary text-xs" onClick={() => saveLog(log.id)}>
                    <Check size={12} /> {t('log.saveShort')}
                  </button>
                  <button type="button" className="btn-secondary text-xs" onClick={() => setEditingId(null)}>
                    <X size={12} /> {t('log.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-cyan-950 dark:text-cyan-50">{log.note}</p>
                  <p className="mt-1 text-xs text-cyan-600">
                    {new Date(log.logged_at).toLocaleString(i18n.language)}
                    {log.mood ? ` · ${t('log.moodLabel')}: ${log.mood}` : ''}
                    {log.appetite ? ` · ${t('log.appetiteLabel')}: ${log.appetite}` : ''}
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
                    <Pencil size={12} /> {t('log.edit')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700"
                    onClick={() => deleteLog(log.id)}
                  >
                    <Trash2 size={12} /> {t('log.delete')}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {logs.length === 0 && (
          <li className="text-center text-sm text-cyan-600">{t('log.empty')}</li>
        )}
      </ul>
    </div>
  )
}

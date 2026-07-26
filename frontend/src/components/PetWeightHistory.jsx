import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Weight } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function WeightChart({ entries }) {
  const points = useMemo(() => {
    if (!entries.length) return []
    const weights = entries.map((e) => e.weight_kg)
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const span = max - min || 1
    const w = 280
    const h = 72
    const padX = 8
    const padY = 10
    return entries.map((e, i) => {
      const x = padX + (entries.length === 1 ? w / 2 : (i / (entries.length - 1)) * (w - padX * 2))
      const y = padY + (1 - (e.weight_kg - min) / span) * (h - padY * 2)
      return { x, y, ...e }
    })
  }, [entries])

  if (points.length < 1) return null

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox="0 0 280 72" className="h-20 w-full text-cyan-600 dark:text-cyan-300" aria-hidden>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r="3.5" fill="currentColor" />
      ))}
    </svg>
  )
}

export default function PetWeightHistory({ petId, canEdit, onPetWeightChange }) {
  const { t, i18n } = useTranslation()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ weight_kg: '', recorded_at: todayISO(), notes: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/pets/${petId}/weights`, { headers: authHeaders() })
      if (res.ok) setEntries(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [petId])

  async function addEntry(e) {
    e.preventDefault()
    const weight = Number(form.weight_kg)
    if (!weight || weight <= 0) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/pets/${petId}/weights`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          weight_kg: weight,
          recorded_at: form.recorded_at,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(typeof err.detail === 'string' ? err.detail : t('pet.weightSaveError'))
        return
      }
      setForm({ weight_kg: '', recorded_at: todayISO(), notes: '' })
      setShowForm(false)
      await load()
      onPetWeightChange?.(weight)
    } finally {
      setSaving(false)
    }
  }

  async function removeEntry(entryId) {
    if (!confirm(t('pet.deleteWeight'))) return
    const res = await fetch(`${API_URL}/api/pets/${petId}/weights/${entryId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) return
    await load()
    const remaining = entries.filter((x) => x.id !== entryId)
    const latest = remaining.length
      ? remaining.reduce((a, b) => (a.recorded_at > b.recorded_at ? a : b))
      : null
    onPetWeightChange?.(latest ? latest.weight_kg : null)
  }

  const latest = entries.length ? entries[entries.length - 1] : null

  return (
    <div className="mt-5 border-t border-cyan-100 pt-4 dark:border-cyan-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">
          <Weight size={13} /> {t('pet.weightHistory')}
        </p>
        {canEdit && !showForm && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-cyan-800 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
            onClick={() => setShowForm(true)}
          >
            <Plus size={12} /> {t('pet.weightAdd')}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-cyan-600 dark:text-cyan-400">{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-cyan-600 dark:text-cyan-400">{t('pet.weightEmpty')}</p>
      ) : (
        <>
          {latest && (
            <p className="mb-2 text-sm text-cyan-900 dark:text-cyan-100">
              <span className="font-semibold">{latest.weight_kg} kg</span>
              <span className="text-cyan-600 dark:text-cyan-400">
                {' '}
                · {new Date(`${latest.recorded_at}T12:00:00`).toLocaleDateString(i18n.language)}
              </span>
            </p>
          )}
          {entries.length >= 2 && <WeightChart entries={entries} />}
          <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
            {[...entries].reverse().map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-cyan-50/70 px-2.5 py-1.5 text-xs text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100"
              >
                <span>
                  <span className="font-medium">{e.weight_kg} kg</span>
                  <span className="text-cyan-600 dark:text-cyan-400">
                    {' '}
                    · {new Date(`${e.recorded_at}T12:00:00`).toLocaleDateString(i18n.language)}
                  </span>
                  {e.notes ? <span className="text-cyan-500"> · {e.notes}</span> : null}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    className="rounded p-0.5 text-rose-600 opacity-70 hover:bg-rose-100 hover:opacity-100 dark:text-rose-300 dark:hover:bg-rose-900"
                    onClick={() => removeEntry(e.id)}
                    aria-label={t('pet.delete')}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {showForm && canEdit && (
        <form onSubmit={addEntry} className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            type="number"
            step="0.1"
            min="0.1"
            className="field px-3 py-2 text-sm"
            placeholder={t('pet.weight')}
            value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
            required
          />
          <input
            type="date"
            className="field px-3 py-2 text-sm"
            value={form.recorded_at}
            onChange={(e) => setForm({ ...form, recorded_at: e.target.value })}
            required
          />
          <div className="flex gap-2 sm:col-span-1">
            <button type="submit" className="btn-primary flex-1 px-3 py-2 text-xs" disabled={saving}>
              {saving ? t('pet.saving') : t('pet.add')}
            </button>
            <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

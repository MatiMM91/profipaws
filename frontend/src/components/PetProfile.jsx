import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Weight,
  AlertTriangle,
  Cpu,
  Pencil,
  CalendarDays,
  Plus,
  Syringe,
  FileText,
  Trash2,
  Check,
  X,
  Activity,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyPetEdit = {
  name: '',
  species: 'dog',
  breed: '',
  birth_date: '',
  chip_id: '',
  weight_kg: '',
  allergies: '',
}

export default function PetProfile() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const [pet, setPet] = useState(null)
  const [vaccines, setVaccines] = useState([])
  const [records, setRecords] = useState([])
  const [events, setEvents] = useState([])
  const [conditions, setConditions] = useState([])
  const [editingPet, setEditingPet] = useState(false)
  const [form, setForm] = useState(emptyPetEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [vaccineForm, setVaccineForm] = useState({ name: '', administered_at: '', next_due_at: '' })
  const [recordForm, setRecordForm] = useState({
    record_type: 'exam',
    title: '',
    occurred_at: '',
  })
  const [eventForm, setEventForm] = useState({
    event_type: 'appointment',
    title: '',
    scheduled_at: '',
  })
  const [conditionForm, setConditionForm] = useState({ name: '', notes: '' })
  const [showConditionForm, setShowConditionForm] = useState(false)

  const [editingVaccineId, setEditingVaccineId] = useState(null)
  const [editingRecordId, setEditingRecordId] = useState(null)
  const [editingEventId, setEditingEventId] = useState(null)
  const [editingConditionId, setEditingConditionId] = useState(null)
  const [vaccineEdit, setVaccineEdit] = useState({})
  const [recordEdit, setRecordEdit] = useState({})
  const [eventEdit, setEventEdit] = useState({})
  const [conditionEdit, setConditionEdit] = useState({})

  async function load() {
    const [petRes, vacRes, recRes, evRes, condRes] = await Promise.all([
      fetch(`${API_URL}/api/pets/${id}`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/vaccines`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/records`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/events`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/conditions`, { headers: authHeaders() }),
    ])
    if (petRes.ok) {
      const data = await petRes.json()
      setPet(data)
      setForm({
        name: data.name || '',
        species: data.species || 'dog',
        breed: data.breed || '',
        birth_date: data.birth_date || '',
        chip_id: data.chip_id || '',
        weight_kg: data.weight_kg != null ? String(data.weight_kg) : '',
        allergies: data.allergies || '',
      })
    }
    if (vacRes.ok) setVaccines(await vacRes.json())
    if (recRes.ok) setRecords(await recRes.json())
    if (evRes.ok) setEvents(await evRes.json())
    if (condRes.ok) setConditions(await condRes.json())
  }

  useEffect(() => {
    load()
  }, [id])

  async function savePet(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`${API_URL}/api/pets/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim() || null,
        birth_date: form.birth_date || null,
        chip_id: form.chip_id.trim() || null,
        weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg),
        allergies: form.allergies.trim() || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(typeof err.detail === 'string' ? err.detail : 'No se pudo guardar')
      return
    }
    setPet(await res.json())
    setEditingPet(false)
  }

  async function addVaccine(e) {
    e.preventDefault()
    const res = await fetch(`${API_URL}/api/pets/${id}/vaccines`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name: vaccineForm.name,
        administered_at: vaccineForm.administered_at,
        next_due_at: vaccineForm.next_due_at || null,
      }),
    })
    if (!res.ok) return alert('No se pudo añadir la vacuna')
    setVaccineForm({ name: '', administered_at: '', next_due_at: '' })
    await load()
  }

  async function saveVaccine(vaccineId) {
    const res = await fetch(`${API_URL}/api/pets/${id}/vaccines/${vaccineId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        name: vaccineEdit.name,
        administered_at: vaccineEdit.administered_at,
        next_due_at: vaccineEdit.next_due_at || null,
      }),
    })
    if (!res.ok) return alert('No se pudo actualizar la vacuna')
    setEditingVaccineId(null)
    await load()
  }

  async function deleteVaccine(vaccineId) {
    if (!confirm(t('pet.deleteVaccine'))) return
    const res = await fetch(`${API_URL}/api/pets/${id}/vaccines/${vaccineId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) return alert('No se pudo borrar')
    await load()
  }

  async function addRecord(e) {
    e.preventDefault()
    const res = await fetch(`${API_URL}/api/pets/${id}/records`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(recordForm),
    })
    if (!res.ok) return alert('No se pudo añadir el registro')
    setRecordForm({ record_type: 'exam', title: '', occurred_at: '' })
    await load()
  }

  async function saveRecord(recordId) {
    const res = await fetch(`${API_URL}/api/pets/${id}/records/${recordId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(recordEdit),
    })
    if (!res.ok) return alert('No se pudo actualizar el registro')
    setEditingRecordId(null)
    await load()
  }

  async function deleteRecord(recordId) {
    if (!confirm(t('pet.deleteRecord'))) return
    const res = await fetch(`${API_URL}/api/pets/${id}/records/${recordId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) return alert('No se pudo borrar')
    await load()
  }

  async function addEvent(e) {
    e.preventDefault()
    const res = await fetch(`${API_URL}/api/pets/${id}/events`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        event_type: eventForm.event_type,
        title: eventForm.title,
        scheduled_at: new Date(eventForm.scheduled_at).toISOString(),
      }),
    })
    if (!res.ok) return alert('No se pudo añadir el recordatorio')
    setEventForm({ event_type: 'appointment', title: '', scheduled_at: '' })
    await load()
  }

  async function saveEvent(eventId) {
    const res = await fetch(`${API_URL}/api/pets/${id}/events/${eventId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        event_type: eventEdit.event_type,
        title: eventEdit.title,
        scheduled_at: new Date(eventEdit.scheduled_at).toISOString(),
        completed: eventEdit.completed,
      }),
    })
    if (!res.ok) return alert('No se pudo actualizar el recordatorio')
    setEditingEventId(null)
    await load()
  }

  async function deleteEvent(eventId) {
    if (!confirm(t('pet.deleteEvent'))) return
    const res = await fetch(`${API_URL}/api/pets/${id}/events/${eventId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) return alert('No se pudo borrar')
    await load()
  }

  async function addCondition(e) {
    e.preventDefault()
    const res = await fetch(`${API_URL}/api/pets/${id}/conditions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name: conditionForm.name.trim(),
        notes: conditionForm.notes.trim() || null,
      }),
    })
    if (!res.ok) return alert('No se pudo añadir')
    setConditionForm({ name: '', notes: '' })
    setShowConditionForm(false)
    await load()
  }

  async function saveCondition(conditionId) {
    const res = await fetch(`${API_URL}/api/pets/${id}/conditions/${conditionId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        name: conditionEdit.name.trim(),
        notes: (conditionEdit.notes || '').trim() || null,
      }),
    })
    if (!res.ok) return alert('No se pudo actualizar')
    setEditingConditionId(null)
    await load()
  }

  async function deleteCondition(conditionId) {
    if (!confirm(t('pet.deleteChronic'))) return
    const res = await fetch(`${API_URL}/api/pets/${id}/conditions/${conditionId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) return alert('No se pudo borrar')
    await load()
  }

  if (!pet) return <p className="text-cyan-700 dark:text-cyan-300">{t('pet.loading')}</p>

  return (
    <div className="space-y-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900 dark:text-cyan-100 dark:text-cyan-300 dark:hover:text-cyan-100">
        <ArrowLeft size={14} /> Volver
      </Link>

      <div className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-cyan-950 dark:text-cyan-50">{pet.name}</h1>
            <p className="mt-1 text-cyan-700">
              {pet.species}
              {pet.breed ? ` · ${pet.breed}` : ''}
              {pet.birth_date ? ` · ${t('pet.born')} ${pet.birth_date}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => {
              setEditingPet((v) => !v)
              setError('')
            }}
          >
            <Pencil size={14} /> {editingPet ? t('pet.cancel') : t('pet.editData')}
          </button>
        </div>

        {!editingPet && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-cyan-800 dark:text-cyan-200">
            {pet.weight_kg != null && (
              <span className="inline-flex items-center gap-1.5">
                <Weight size={14} /> {pet.weight_kg} kg
              </span>
            )}
            {pet.chip_id ? (
              <span className="inline-flex items-center gap-1.5">
                <Cpu size={14} /> {t('pet.chip')} {pet.chip_id}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-cyan-500">
                <Cpu size={14} /> {t('pet.noChip')}
              </span>
            )}
            {pet.allergies && (
              <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <AlertTriangle size={14} /> {pet.allergies}
              </span>
            )}
          </div>
        )}

        {editingPet && (
          <form onSubmit={savePet} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input className="field px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select className="field px-3 py-2 text-sm" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
              <option value="dog">{t('dashboard.dog')}</option>
              <option value="cat">{t('dashboard.cat')}</option>
              <option value="other">{t('pet.other')}</option>
            </select>
            <input className="field px-3 py-2 text-sm" placeholder={t('pet.breed')} value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
            <input type="date" className="field px-3 py-2 text-sm" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            <input className="field px-3 py-2 text-sm" placeholder={t('pet.chipPlaceholder')} value={form.chip_id} onChange={(e) => setForm({ ...form, chip_id: e.target.value })} />
            <input type="number" step="0.1" className="field px-3 py-2 text-sm" placeholder={t('pet.weight')} value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
            <textarea className="field px-3 py-2 text-sm sm:col-span-2" placeholder={t('pet.allergies')} rows={2} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <button type="submit" className="btn-primary sm:col-span-2" disabled={saving}>{saving ? t('pet.saving') : t('pet.saveChanges')}</button>
          </form>
        )}

        {/* Chronic conditions — compact chips inside profile card */}
        <div className="mt-5 border-t border-cyan-100 pt-4 dark:border-cyan-800">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700/80 dark:text-rose-300/90">
              <Activity size={13} /> {t('pet.chronic')}
            </p>
            {!showConditionForm && editingConditionId == null && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                onClick={() => setShowConditionForm(true)}
              >
                <Plus size={12} /> {t('pet.chronicAdd')}
              </button>
            )}
          </div>

          {showConditionForm && (
            <form onSubmit={addCondition} className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                className="field px-3 py-1.5 text-sm"
                placeholder={t('pet.chronicPlaceholder')}
                value={conditionForm.name}
                onChange={(e) => setConditionForm({ ...conditionForm, name: e.target.value })}
                required
                autoFocus
              />
              <input
                className="field px-3 py-1.5 text-sm"
                placeholder={t('pet.chronicNotes')}
                value={conditionForm.notes}
                onChange={(e) => setConditionForm({ ...conditionForm, notes: e.target.value })}
              />
              <div className="flex gap-1.5">
                <button type="submit" className="btn-primary px-3 py-1.5 text-xs">{t('pet.chronicAdd')}</button>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => {
                    setShowConditionForm(false)
                    setConditionForm({ name: '', notes: '' })
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            </form>
          )}

          {conditions.length === 0 && !showConditionForm ? (
            <p className="text-xs text-cyan-500 dark:text-cyan-500">{t('pet.chronicEmpty')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {conditions.map((c) => (
                <li key={c.id}>
                  {editingConditionId === c.id ? (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 p-2 dark:border-rose-900 dark:bg-rose-950/40">
                      <input
                        className="field !min-w-[8rem] px-2 py-1 text-xs"
                        value={conditionEdit.name}
                        onChange={(e) => setConditionEdit({ ...conditionEdit, name: e.target.value })}
                      />
                      <input
                        className="field !min-w-[8rem] px-2 py-1 text-xs"
                        placeholder={t('pet.chronicNotes')}
                        value={conditionEdit.notes || ''}
                        onChange={(e) => setConditionEdit({ ...conditionEdit, notes: e.target.value })}
                      />
                      <button type="button" className="rounded-md bg-cyan-600 px-2 py-1 text-xs text-white" onClick={() => saveCondition(c.id)}>
                        <Check size={12} />
                      </button>
                      <button type="button" className="rounded-md bg-white px-2 py-1 text-xs dark:bg-cyan-950" onClick={() => setEditingConditionId(null)}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50 px-3 py-1 text-xs text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-100"
                      title={c.notes || undefined}
                    >
                      <span className="truncate font-medium">{c.name}</span>
                      {c.notes && <span className="hidden max-w-[10rem] truncate text-rose-700/70 dark:text-rose-300/70 sm:inline">· {c.notes}</span>}
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-rose-600 opacity-70 hover:bg-rose-100 hover:opacity-100 dark:text-rose-300 dark:hover:bg-rose-900"
                        onClick={() => {
                          setEditingConditionId(c.id)
                          setConditionEdit({ name: c.name, notes: c.notes || '' })
                          setShowConditionForm(false)
                        }}
                        aria-label={t('pet.edit')}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-rose-600 opacity-70 hover:bg-rose-100 hover:opacity-100 dark:text-rose-300 dark:hover:bg-rose-900"
                        onClick={() => deleteCondition(c.id)}
                        aria-label={t('pet.delete')}
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link to={`/pets/${id}/log`} className="btn-secondary text-sm">{t('pet.diary')}</Link>
          <Link to={`/pets/${id}/vet-access`} className="btn-primary text-sm">{t('pet.vetAccess')}</Link>
        </div>
      </div>

      {/* Vaccines */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950 dark:text-cyan-50">
          <Syringe size={18} /> {t('pet.vaccines')}
        </h2>
        <form onSubmit={addVaccine} className="grid gap-2 rounded-xl border border-cyan-100 bg-white dark:border-cyan-800 dark:bg-cyan-900/40 p-4 sm:grid-cols-4">
          <input className="field px-3 py-2 text-sm" placeholder={t('pet.vaccineName')} value={vaccineForm.name} onChange={(e) => setVaccineForm({ ...vaccineForm, name: e.target.value })} required />
          <input type="date" className="field px-3 py-2 text-sm" value={vaccineForm.administered_at} onChange={(e) => setVaccineForm({ ...vaccineForm, administered_at: e.target.value })} required />
          <input type="date" className="field px-3 py-2 text-sm" value={vaccineForm.next_due_at} onChange={(e) => setVaccineForm({ ...vaccineForm, next_due_at: e.target.value })} />
          <button type="submit" className="btn-primary text-sm"><Plus size={14} /> {t('pet.add')}</button>
        </form>
        <ul className="space-y-2">
          {vaccines.length === 0 && <li className="text-sm text-cyan-600">{t('pet.noVaccines')}</li>}
          {vaccines.map((v) => (
            <li key={v.id} className="rounded-xl border border-cyan-100 bg-white dark:border-cyan-800 dark:bg-cyan-900/40 px-4 py-3 text-sm">
              {editingVaccineId === v.id ? (
                <div className="grid gap-2 sm:grid-cols-4">
                  <input className="field px-2 py-1.5" value={vaccineEdit.name} onChange={(e) => setVaccineEdit({ ...vaccineEdit, name: e.target.value })} />
                  <input type="date" className="field px-2 py-1.5" value={vaccineEdit.administered_at} onChange={(e) => setVaccineEdit({ ...vaccineEdit, administered_at: e.target.value })} />
                  <input type="date" className="field px-2 py-1.5" value={vaccineEdit.next_due_at || ''} onChange={(e) => setVaccineEdit({ ...vaccineEdit, next_due_at: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => saveVaccine(v.id)}><Check size={12} /> {t('common.save')}</button>
                    <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditingVaccineId(null)}><X size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-cyan-900 dark:text-cyan-100">{v.name}</strong>
                    <span className="text-cyan-600"> · {v.administered_at}</span>
                    {v.next_due_at && <span className="text-cyan-500"> · {t('pet.next')} {v.next_due_at}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800" onClick={() => { setEditingVaccineId(v.id); setVaccineEdit({ name: v.name, administered_at: v.administered_at, next_due_at: v.next_due_at || '' }) }}>
                      <Pencil size={12} /> {t('pet.edit')}
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700" onClick={() => deleteVaccine(v.id)}>
                      <Trash2 size={12} /> {t('pet.delete')}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Records */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950 dark:text-cyan-50">
          <FileText size={18} /> {t('pet.records')}
        </h2>
        <form onSubmit={addRecord} className="grid gap-2 rounded-xl border border-cyan-100 bg-white dark:border-cyan-800 dark:bg-cyan-900/40 p-4 sm:grid-cols-4">
          <select className="field px-3 py-2 text-sm" value={recordForm.record_type} onChange={(e) => setRecordForm({ ...recordForm, record_type: e.target.value })}>
            <option value="exam">{t('pet.exam')}</option>
            <option value="disease">{t('pet.disease')}</option>
            <option value="surgery">{t('pet.surgery')}</option>
            <option value="treatment">{t('pet.treatment')}</option>
            <option value="other">{t('pet.other')}</option>
          </select>
          <input className="field px-3 py-2 text-sm" placeholder={t('pet.title')} value={recordForm.title} onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })} required />
          <input type="date" className="field px-3 py-2 text-sm" value={recordForm.occurred_at} onChange={(e) => setRecordForm({ ...recordForm, occurred_at: e.target.value })} required />
          <button type="submit" className="btn-primary text-sm"><Plus size={14} /> {t('pet.add')}</button>
        </form>
        <ul className="space-y-2">
          {records.length === 0 && <li className="text-sm text-cyan-600">{t('pet.noRecords')}</li>}
          {records.map((r) => (
            <li key={r.id} className="rounded-xl border border-cyan-100 bg-white dark:border-cyan-800 dark:bg-cyan-900/40 px-4 py-3 text-sm">
              {editingRecordId === r.id ? (
                <div className="grid gap-2 sm:grid-cols-4">
                  <select className="field px-2 py-1.5" value={recordEdit.record_type} onChange={(e) => setRecordEdit({ ...recordEdit, record_type: e.target.value })}>
                    <option value="exam">{t('pet.exam')}</option>
                    <option value="disease">{t('pet.disease')}</option>
                    <option value="surgery">{t('pet.surgery')}</option>
                    <option value="treatment">{t('pet.treatment')}</option>
                    <option value="other">{t('pet.other')}</option>
                  </select>
                  <input className="field px-2 py-1.5" value={recordEdit.title} onChange={(e) => setRecordEdit({ ...recordEdit, title: e.target.value })} />
                  <input type="date" className="field px-2 py-1.5" value={recordEdit.occurred_at} onChange={(e) => setRecordEdit({ ...recordEdit, occurred_at: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => saveRecord(r.id)}><Check size={12} /> {t('common.save')}</button>
                    <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditingRecordId(null)}><X size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="rounded bg-cyan-100 px-2 py-0.5 text-xs font-medium uppercase text-cyan-800">{r.record_type}</span>
                    <strong className="ml-2 text-cyan-900 dark:text-cyan-100">{r.title}</strong>
                    <span className="text-cyan-600"> · {r.occurred_at}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800" onClick={() => { setEditingRecordId(r.id); setRecordEdit({ record_type: r.record_type, title: r.title, occurred_at: r.occurred_at }) }}>
                      <Pencil size={12} /> {t('pet.edit')}
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700" onClick={() => deleteRecord(r.id)}>
                      <Trash2 size={12} /> {t('pet.delete')}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Calendar */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950 dark:text-cyan-50">
          <CalendarDays size={18} /> {t('pet.calendar')}
        </h2>
        <p className="text-sm text-cyan-700/80 dark:text-cyan-300/80">{t('pet.calendarHint')}</p>
        <form onSubmit={addEvent} className="grid gap-2 rounded-xl border border-cyan-100 bg-white dark:border-cyan-800 dark:bg-cyan-900/40 p-4 sm:grid-cols-4">
          <select className="field px-3 py-2 text-sm" value={eventForm.event_type} onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}>
            <option value="appointment">{t('pet.appointment')}</option>
            <option value="vaccine">{t('pet.vaccine')}</option>
            <option value="medicine">{t('pet.medicine')}</option>
            <option value="other">{t('pet.other')}</option>
          </select>
          <input className="field px-3 py-2 text-sm" placeholder={t('pet.title')} value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
          <input type="datetime-local" className="field px-3 py-2 text-sm" value={eventForm.scheduled_at} onChange={(e) => setEventForm({ ...eventForm, scheduled_at: e.target.value })} required />
          <button type="submit" className="btn-primary text-sm"><Plus size={14} /> {t('pet.add')}</button>
        </form>
        <ul className="space-y-2">
          {events.length === 0 && <li className="text-sm text-cyan-600">{t('pet.noEvents')}</li>}
          {events.map((ev) => (
            <li key={ev.id} className="rounded-xl border border-cyan-100 bg-white dark:border-cyan-800 dark:bg-cyan-900/40 px-4 py-3 text-sm">
              {editingEventId === ev.id ? (
                <div className="grid gap-2 sm:grid-cols-4">
                  <select className="field px-2 py-1.5" value={eventEdit.event_type} onChange={(e) => setEventEdit({ ...eventEdit, event_type: e.target.value })}>
                    <option value="appointment">{t('pet.appointment')}</option>
                    <option value="vaccine">{t('pet.vaccine')}</option>
                    <option value="medicine">{t('pet.medicine')}</option>
                    <option value="other">{t('pet.other')}</option>
                  </select>
                  <input className="field px-2 py-1.5" value={eventEdit.title} onChange={(e) => setEventEdit({ ...eventEdit, title: e.target.value })} />
                  <input type="datetime-local" className="field px-2 py-1.5" value={eventEdit.scheduled_at} onChange={(e) => setEventEdit({ ...eventEdit, scheduled_at: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => saveEvent(ev.id)}><Check size={12} /> {t('common.save')}</button>
                    <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditingEventId(null)}><X size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-medium uppercase text-teal-800">{ev.event_type}</span>
                    <strong className="ml-2 text-cyan-900 dark:text-cyan-100">{ev.title}</strong>
                    <span className="text-cyan-600"> · {new Date(ev.scheduled_at).toLocaleString(i18n.language)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800" onClick={() => { setEditingEventId(ev.id); setEventEdit({ event_type: ev.event_type, title: ev.title, scheduled_at: toLocalInput(ev.scheduled_at), completed: ev.completed }) }}>
                      <Pencil size={12} /> {t('pet.edit')}
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700" onClick={() => deleteEvent(ev.id)}>
                      <Trash2 size={12} /> {t('pet.delete')}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

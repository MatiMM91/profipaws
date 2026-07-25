import { useEffect, useState } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Weight,
  AlertTriangle,
  Cpu,
  Pencil,
  Plus,
  FileText,
  Trash2,
  Check,
  X,
  Activity,
  Download,
  Bell,
  Sparkles,
  Users,
  QrCode,
} from 'lucide-react'
import SpeciesIcon, { SPECIES_OPTIONS } from './SpeciesIcon'
import PetSharePanel from './PetSharePanel'
import PetHistorial from './PetHistorial'
import PetConsultations from './PetConsultations'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function parseApiDate(iso) {
  if (!iso) return null
  // Backend stores UTC as naive datetimes; treat missing TZ as UTC.
  const s = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`
  return new Date(s)
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = parseApiDate(iso)
  if (!d || Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatLocalDateTime(iso, locale) {
  const d = parseApiDate(iso)
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(locale)
}

function parseAllergies(text) {
  if (!text) return []
  return String(text)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function serializeAllergies(list) {
  return list.length ? list.join(', ') : null
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

const PET_TABS = [
  { id: 'profile', hash: '#perfil', labelKey: 'pet.tabProfile' },
  { id: 'historial', hash: '#historial', labelKey: 'pet.tabHistorial' },
  { id: 'seguimiento', hash: '#seguimiento', labelKey: 'pet.tabSeguimiento' },
  { id: 'calendar', hash: '#calendario', labelKey: 'pet.tabCalendar' },
  { id: 'tools', hash: '#herramientas', labelKey: 'pet.tabTools' },
]

function tabFromHash(hash) {
  const found = PET_TABS.find((tab) => tab.hash === hash)
  return found?.id || 'profile'
}

export default function PetProfile() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState(() => tabFromHash(typeof window !== 'undefined' ? window.location.hash : ''))
  const [pet, setPet] = useState(null)
  const [vaccines, setVaccines] = useState([])
  const [records, setRecords] = useState([])
  const [events, setEvents] = useState([])
  const [conditions, setConditions] = useState([])
  const [isPro, setIsPro] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [exportBusy, setExportBusy] = useState('')
  const [editingPet, setEditingPet] = useState(false)
  const [form, setForm] = useState(emptyPetEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [eventForm, setEventForm] = useState({
    event_type: 'appointment',
    title: '',
    scheduled_at: '',
  })
  const [conditionForm, setConditionForm] = useState({ name: '', notes: '' })
  const [showConditionForm, setShowConditionForm] = useState(false)
  const [showAllergyForm, setShowAllergyForm] = useState(false)
  const [allergyForm, setAllergyForm] = useState('')
  const [editingAllergyIdx, setEditingAllergyIdx] = useState(null)
  const [allergyEdit, setAllergyEdit] = useState('')

  const [editingEventId, setEditingEventId] = useState(null)
  const [editingConditionId, setEditingConditionId] = useState(null)
  const [eventEdit, setEventEdit] = useState({})
  const [conditionEdit, setConditionEdit] = useState({})

  const myRole = pet?.my_role || 'owner'
  const isOwner = myRole === 'owner'
  const canEdit = myRole === 'owner' || myRole === 'edit'
  const allergyList = parseAllergies(pet?.allergies)

  async function persistAllergies(nextList) {
    const allergies = serializeAllergies(nextList)
    const res = await fetch(`${API_URL}/api/pets/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ allergies }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(typeof err.detail === 'string' ? err.detail : t('pet.allergySaveError'))
      return false
    }
    const data = await res.json()
    setPet(data)
    setForm((f) => ({ ...f, allergies: data.allergies || '' }))
    return true
  }

  async function addAllergy(e) {
    e.preventDefault()
    const name = allergyForm.trim()
    if (!name) return
    const ok = await persistAllergies([...allergyList, name])
    if (ok) {
      setAllergyForm('')
      setShowAllergyForm(false)
    }
  }

  async function saveAllergy(idx) {
    const name = allergyEdit.trim()
    if (!name) return
    const next = [...allergyList]
    next[idx] = name
    const ok = await persistAllergies(next)
    if (ok) setEditingAllergyIdx(null)
  }

  async function deleteAllergy(idx) {
    if (!confirm(t('pet.deleteAllergy'))) return
    const next = allergyList.filter((_, i) => i !== idx)
    await persistAllergies(next)
  }

  async function load() {
    const [petRes, vacRes, recRes, evRes, condRes, subRes] = await Promise.all([
      fetch(`${API_URL}/api/pets/${id}`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/vaccines`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/records`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/events`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/conditions`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/subscriptions/me`, { headers: authHeaders() }),
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

    let pro = false
    if (subRes.ok) {
      const sub = await subRes.json()
      pro = sub.tier === 'pro' || sub.tier === 'PRO'
      setIsPro(pro)
    } else {
      setIsPro(false)
    }

    if (pro) {
      const alertRes = await fetch(`${API_URL}/api/alerts/upcoming?days=14`, { headers: authHeaders() })
      if (alertRes.ok) {
        const data = await alertRes.json()
        const mine = (data.items || []).filter((a) => String(a.pet_id) === String(id))
        setAlerts(mine)
      } else {
        setAlerts([])
      }
    } else {
      setAlerts([])
    }
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    setTab(tabFromHash(location.hash))
  }, [location.hash])

  function selectTab(nextId) {
    const next = PET_TABS.find((item) => item.id === nextId) || PET_TABS[0]
    setTab(next.id)
    navigate(`${location.pathname}${next.hash}`, { replace: true })
  }

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

  async function downloadExport(format) {
    setExportBusy(format)
    setError('')
    const path = format === 'pdf' ? 'export/pdf' : 'export'
    const res = await fetch(`${API_URL}/api/pets/${id}/${path}`, { headers: authHeaders() })
    setExportBusy('')
    if (res.status === 402) {
      setError(t('pet.proRequired'))
      return
    }
    if (!res.ok) {
      setError(t('pet.exportError'))
      return
    }
    if (format === 'pdf') {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `profipaws-${pet?.name || id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      return
    }
    const data = await res.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profipaws-${pet?.name || id}.json`
    a.click()
    URL.revokeObjectURL(url)
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-100">
              <SpeciesIcon species={pet.species} size={28} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-bold text-cyan-950 dark:text-cyan-50">{pet.name}</h1>
                {!isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">
                    <Users size={11} />
                    {canEdit ? t('share.canEdit') : t('share.canRead')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-cyan-700 dark:text-cyan-300">
                {t(`dashboard.${pet.species}`, { defaultValue: pet.species })}
                {pet.breed ? ` · ${pet.breed}` : ''}
                {pet.birth_date ? ` · ${t('pet.born')} ${pet.birth_date}` : ''}
              </p>
            </div>
          </div>

          <nav
            className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-1 lg:max-w-[min(100%,28rem)] lg:flex-wrap lg:justify-end lg:overflow-visible"
            aria-label={t('pet.tabsLabel')}
          >
            {PET_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
                  tab === item.id
                    ? 'bg-cyan-700 text-white dark:bg-cyan-500 dark:text-cyan-950'
                    : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-900/60 dark:text-cyan-100 dark:hover:bg-cyan-800'
                }`}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'profile' && (
          <>
        {canEdit && (
          <div className="mt-4 flex justify-end">
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
        )}

        {error && !editingPet && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {editingPet && (
          <form onSubmit={savePet} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input className="field px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select className="field px-3 py-2 text-sm" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
              {SPECIES_OPTIONS.map((key) => (
                <option key={key} value={key}>{t(`dashboard.${key}`)}</option>
              ))}
            </select>
            <input className="field px-3 py-2 text-sm" placeholder={t('pet.breed')} value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
            <input type="date" className="field px-3 py-2 text-sm" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            <input className="field px-3 py-2 text-sm" placeholder={t('pet.chipPlaceholder')} value={form.chip_id} onChange={(e) => setForm({ ...form, chip_id: e.target.value })} />
            <input type="number" step="0.1" className="field px-3 py-2 text-sm" placeholder={t('pet.weight')} value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <button type="submit" className="btn-primary sm:col-span-2" disabled={saving}>{saving ? t('pet.saving') : t('pet.saveChanges')}</button>
          </form>
        )}

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
          </div>
        )}

        {/* Allergies */}
        <div className="mt-5 border-t border-cyan-100 pt-4 dark:border-cyan-800">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700/90 dark:text-amber-300/90">
              <AlertTriangle size={13} /> {t('pet.allergies')}
            </p>
            {!showAllergyForm && editingAllergyIdx == null && canEdit && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                onClick={() => setShowAllergyForm(true)}
              >
                <Plus size={12} /> {t('pet.allergyAdd')}
              </button>
            )}
          </div>

          {showAllergyForm && canEdit && (
            <form onSubmit={addAllergy} className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className="field px-3 py-1.5 text-sm"
                placeholder={t('pet.allergyPlaceholder')}
                value={allergyForm}
                onChange={(e) => setAllergyForm(e.target.value)}
                required
                autoFocus
              />
              <div className="flex gap-1.5">
                <button type="submit" className="btn-primary px-3 py-1.5 text-xs">{t('pet.allergyAdd')}</button>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => {
                    setShowAllergyForm(false)
                    setAllergyForm('')
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            </form>
          )}

          {allergyList.length === 0 && !showAllergyForm ? (
            <p className="text-xs text-cyan-500 dark:text-cyan-500">{t('pet.allergyEmpty')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {allergyList.map((name, idx) => (
                <li key={`${name}-${idx}`}>
                  {editingAllergyIdx === idx ? (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-900 dark:bg-amber-950/40">
                      <input
                        className="field !min-w-[8rem] px-2 py-1 text-xs"
                        value={allergyEdit}
                        onChange={(e) => setAllergyEdit(e.target.value)}
                      />
                      <button type="button" className="rounded-md bg-cyan-600 px-2 py-1 text-xs text-white" onClick={() => saveAllergy(idx)}>
                        <Check size={12} />
                      </button>
                      <button type="button" className="rounded-md bg-white px-2 py-1 text-xs dark:bg-cyan-950" onClick={() => setEditingAllergyIdx(null)}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-100">
                      <span className="truncate font-medium">{name}</span>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            className="rounded-full p-0.5 text-amber-700 opacity-70 hover:bg-amber-100 hover:opacity-100 dark:text-amber-300 dark:hover:bg-amber-900"
                            onClick={() => {
                              setEditingAllergyIdx(idx)
                              setAllergyEdit(name)
                              setShowAllergyForm(false)
                            }}
                            aria-label={t('pet.edit')}
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            className="rounded-full p-0.5 text-amber-700 opacity-70 hover:bg-amber-100 hover:opacity-100 dark:text-amber-300 dark:hover:bg-amber-900"
                            onClick={() => deleteAllergy(idx)}
                            aria-label={t('pet.delete')}
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Chronic conditions */}
        <div className="mt-5 border-t border-cyan-100 pt-4 dark:border-cyan-800">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700/80 dark:text-rose-300/90">
              <Activity size={13} /> {t('pet.chronic')}
            </p>
            {!showConditionForm && editingConditionId == null && canEdit && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                onClick={() => setShowConditionForm(true)}
              >
                <Plus size={12} /> {t('pet.chronicAdd')}
              </button>
            )}
          </div>

          {showConditionForm && canEdit && (
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
                      {canEdit && (
                      <>
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
                      </>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {isOwner && <PetSharePanel petId={id} embedded />}

        {/* Upcoming alerts */}
        <div className="mt-5 rounded-xl border border-cyan-100 bg-white/70 p-4 dark:border-cyan-800 dark:bg-cyan-950/30">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">
            <Bell size={13} /> {t('pet.upcomingAlerts')}
          </p>
          {isPro ? (
            <>
              {alerts.length === 0 ? (
                <p className="text-xs text-cyan-600 dark:text-cyan-400">{t('pet.noUpcomingAlerts')}</p>
              ) : (
                <ul className="space-y-1.5">
                  {alerts.map((a) => (
                    <li key={`${a.kind}-${a.id}`} className="text-xs text-cyan-900 dark:text-cyan-100">
                      <span className="font-medium">{a.title}</span>
                      <span className="text-cyan-600 dark:text-cyan-400">
                        {' '}· {a.kind === 'vaccine' ? t('pet.vaccine') : t('pet.appointment')} · {formatLocalDateTime(a.due_at, i18n.language) || String(a.due_at).slice(0, 16)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] text-cyan-600/80 dark:text-cyan-400/80">{t('pet.alertsHint')}</p>
            </>
          ) : (
            <p className="text-xs text-cyan-700 dark:text-cyan-300">
              {t('pet.alertsProHint')}{' '}
              <Link to="/pricing" className="font-medium underline-offset-2 hover:underline">
                {t('pet.upgradeForPro')}
              </Link>
            </p>
          )}
        </div>
          </>
        )}

        {tab === 'tools' && (
        <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50/50 p-4 dark:border-cyan-800 dark:bg-cyan-950/40">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">
              <Sparkles size={13} /> {t('pet.tools')}
            </p>
            {!isPro && (
              <Link to="/pricing" className="text-xs font-medium text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-300">
                {t('pet.upgradeForPro')}
              </Link>
            )}
          </div>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="space-y-2">
            {isOwner && (
              <div className="flex flex-col gap-3 rounded-lg border border-cyan-100/90 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-cyan-800 dark:bg-cyan-950/50">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
                    <QrCode size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cyan-950 dark:text-cyan-50">{t('pet.vetAccess')}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-cyan-600 dark:text-cyan-400">{t('pet.vetAccessDesc')}</p>
                  </div>
                </div>
                <Link to={`/pets/${id}/vet-access`} className="btn-primary shrink-0 px-3 py-1.5 text-xs sm:self-center">
                  {t('pet.vetAccessAction')}
                </Link>
              </div>
            )}
            <div className="flex flex-col gap-3 rounded-lg border border-cyan-100/90 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-cyan-800 dark:bg-cyan-950/50">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
                  <FileText size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-cyan-950 dark:text-cyan-50">{t('pet.exportPdf')}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-cyan-600 dark:text-cyan-400">{t('pet.exportPdfDesc')}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary shrink-0 px-3 py-1.5 text-xs sm:self-center"
                disabled={!isPro || !!exportBusy}
                onClick={() => downloadExport('pdf')}
              >
                {exportBusy === 'pdf' ? t('pet.exporting') : t('pet.exportPdfAction')}
              </button>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-cyan-100/90 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-cyan-800 dark:bg-cyan-950/50">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
                  <Download size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-cyan-950 dark:text-cyan-50">{t('pet.exportJson')}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-cyan-600 dark:text-cyan-400">{t('pet.exportJsonDesc')}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary shrink-0 px-3 py-1.5 text-xs sm:self-center"
                disabled={!isPro || !!exportBusy}
                onClick={() => downloadExport('json')}
              >
                {exportBusy === 'json' ? t('pet.exporting') : t('pet.exportJsonAction')}
              </button>
            </div>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-cyan-700 dark:text-cyan-300">{t('pet.exportProHint')}</p>
          )}
        </div>
        )}

        {tab === 'historial' && (
          <div className="mt-5">
            <PetHistorial
              petId={id}
              vaccines={vaccines}
              records={records}
              canEdit={canEdit}
              onRefresh={load}
              hideTitle
            />
          </div>
        )}

        {tab === 'seguimiento' && (
          <div className="mt-5">
            <PetConsultations petId={id} canEdit={canEdit} hideTitle />
          </div>
        )}

        {tab === 'calendar' && (
      <section className="mt-5 space-y-3">
        <p className="text-sm text-cyan-700/80 dark:text-cyan-300/80">{t('pet.calendarHint')}</p>
        {canEdit && (
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
        )}
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
                    <span className="text-cyan-600"> · {formatLocalDateTime(ev.scheduled_at, i18n.language)}</span>
                  </div>
                  {canEdit && (
                  <div className="flex gap-2">
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800" onClick={() => { setEditingEventId(ev.id); setEventEdit({ event_type: ev.event_type, title: ev.title, scheduled_at: toLocalInput(ev.scheduled_at), completed: ev.completed }) }}>
                      <Pencil size={12} /> {t('pet.edit')}
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700" onClick={() => deleteEvent(ev.id)}>
                      <Trash2 size={12} /> {t('pet.delete')}
                    </button>
                  </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
        )}
      </div>
    </div>
  )
}

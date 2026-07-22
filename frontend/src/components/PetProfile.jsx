import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  const { id } = useParams()
  const [pet, setPet] = useState(null)
  const [vaccines, setVaccines] = useState([])
  const [records, setRecords] = useState([])
  const [events, setEvents] = useState([])
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

  const [editingVaccineId, setEditingVaccineId] = useState(null)
  const [editingRecordId, setEditingRecordId] = useState(null)
  const [editingEventId, setEditingEventId] = useState(null)
  const [vaccineEdit, setVaccineEdit] = useState({})
  const [recordEdit, setRecordEdit] = useState({})
  const [eventEdit, setEventEdit] = useState({})

  async function load() {
    const [petRes, vacRes, recRes, evRes] = await Promise.all([
      fetch(`${API_URL}/api/pets/${id}`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/vaccines`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/records`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/pets/${id}/events`, { headers: authHeaders() }),
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
    if (!confirm('¿Borrar esta vacuna?')) return
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
    if (!confirm('¿Borrar este registro médico?')) return
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
    if (!confirm('¿Borrar este recordatorio?')) return
    const res = await fetch(`${API_URL}/api/pets/${id}/events/${eventId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) return alert('No se pudo borrar')
    await load()
  }

  if (!pet) return <p className="text-cyan-700">Cargando perfil…</p>

  return (
    <div className="space-y-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900">
        <ArrowLeft size={14} /> Volver
      </Link>

      <div className="rounded-2xl border border-cyan-100 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-cyan-950">{pet.name}</h1>
            <p className="mt-1 text-cyan-700">
              {pet.species}
              {pet.breed ? ` · ${pet.breed}` : ''}
              {pet.birth_date ? ` · nacido ${pet.birth_date}` : ''}
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
            <Pencil size={14} /> {editingPet ? 'Cancelar' : 'Editar datos'}
          </button>
        </div>

        {!editingPet && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-cyan-800">
            {pet.weight_kg != null && (
              <span className="inline-flex items-center gap-1.5">
                <Weight size={14} /> {pet.weight_kg} kg
              </span>
            )}
            {pet.chip_id ? (
              <span className="inline-flex items-center gap-1.5">
                <Cpu size={14} /> Chip {pet.chip_id}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-cyan-500">
                <Cpu size={14} /> Sin chip (puedes añadirlo al editar)
              </span>
            )}
            {pet.allergies && (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <AlertTriangle size={14} /> {pet.allergies}
              </span>
            )}
          </div>
        )}

        {editingPet && (
          <form onSubmit={savePet} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
              <option value="dog">Perro</option>
              <option value="cat">Gato</option>
              <option value="other">Otro</option>
            </select>
            <input className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" placeholder="Raza" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
            <input type="date" className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            <input className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" placeholder="Nº chip" value={form.chip_id} onChange={(e) => setForm({ ...form, chip_id: e.target.value })} />
            <input type="number" step="0.1" className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" placeholder="Peso (kg)" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
            <textarea className="rounded-lg border border-cyan-200 px-3 py-2 text-sm sm:col-span-2" placeholder="Alergias" rows={2} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <button type="submit" className="btn-primary sm:col-span-2" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </form>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link to={`/pets/${id}/log`} className="btn-secondary text-sm">Diario</Link>
          <Link to={`/pets/${id}/vet-access`} className="btn-primary text-sm">Acceso vet (QR/PIN)</Link>
        </div>
      </div>

      {/* Vaccines */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950">
          <Syringe size={18} /> Vacunas
        </h2>
        <form onSubmit={addVaccine} className="grid gap-2 rounded-xl border border-cyan-100 bg-white p-4 sm:grid-cols-4">
          <input className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" placeholder="Nombre vacuna" value={vaccineForm.name} onChange={(e) => setVaccineForm({ ...vaccineForm, name: e.target.value })} required />
          <input type="date" className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" value={vaccineForm.administered_at} onChange={(e) => setVaccineForm({ ...vaccineForm, administered_at: e.target.value })} required />
          <input type="date" className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" value={vaccineForm.next_due_at} onChange={(e) => setVaccineForm({ ...vaccineForm, next_due_at: e.target.value })} />
          <button type="submit" className="btn-primary text-sm"><Plus size={14} /> Añadir</button>
        </form>
        <ul className="space-y-2">
          {vaccines.length === 0 && <li className="text-sm text-cyan-600">Sin vacunas registradas.</li>}
          {vaccines.map((v) => (
            <li key={v.id} className="rounded-xl border border-cyan-100 bg-white px-4 py-3 text-sm">
              {editingVaccineId === v.id ? (
                <div className="grid gap-2 sm:grid-cols-4">
                  <input className="rounded-lg border border-cyan-200 px-2 py-1.5" value={vaccineEdit.name} onChange={(e) => setVaccineEdit({ ...vaccineEdit, name: e.target.value })} />
                  <input type="date" className="rounded-lg border border-cyan-200 px-2 py-1.5" value={vaccineEdit.administered_at} onChange={(e) => setVaccineEdit({ ...vaccineEdit, administered_at: e.target.value })} />
                  <input type="date" className="rounded-lg border border-cyan-200 px-2 py-1.5" value={vaccineEdit.next_due_at || ''} onChange={(e) => setVaccineEdit({ ...vaccineEdit, next_due_at: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => saveVaccine(v.id)}><Check size={12} /> Guardar</button>
                    <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditingVaccineId(null)}><X size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-cyan-900">{v.name}</strong>
                    <span className="text-cyan-600"> · {v.administered_at}</span>
                    {v.next_due_at && <span className="text-cyan-500"> · próxima {v.next_due_at}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800" onClick={() => { setEditingVaccineId(v.id); setVaccineEdit({ name: v.name, administered_at: v.administered_at, next_due_at: v.next_due_at || '' }) }}>
                      <Pencil size={12} /> Editar
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700" onClick={() => deleteVaccine(v.id)}>
                      <Trash2 size={12} /> Borrar
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
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950">
          <FileText size={18} /> Historial médico
        </h2>
        <form onSubmit={addRecord} className="grid gap-2 rounded-xl border border-cyan-100 bg-white p-4 sm:grid-cols-4">
          <select className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" value={recordForm.record_type} onChange={(e) => setRecordForm({ ...recordForm, record_type: e.target.value })}>
            <option value="exam">Examen</option>
            <option value="disease">Enfermedad</option>
            <option value="surgery">Cirugía</option>
            <option value="treatment">Tratamiento</option>
            <option value="other">Otro</option>
          </select>
          <input className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" placeholder="Título" value={recordForm.title} onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })} required />
          <input type="date" className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" value={recordForm.occurred_at} onChange={(e) => setRecordForm({ ...recordForm, occurred_at: e.target.value })} required />
          <button type="submit" className="btn-primary text-sm"><Plus size={14} /> Añadir</button>
        </form>
        <ul className="space-y-2">
          {records.length === 0 && <li className="text-sm text-cyan-600">Sin registros médicos.</li>}
          {records.map((r) => (
            <li key={r.id} className="rounded-xl border border-cyan-100 bg-white px-4 py-3 text-sm">
              {editingRecordId === r.id ? (
                <div className="grid gap-2 sm:grid-cols-4">
                  <select className="rounded-lg border border-cyan-200 px-2 py-1.5" value={recordEdit.record_type} onChange={(e) => setRecordEdit({ ...recordEdit, record_type: e.target.value })}>
                    <option value="exam">Examen</option>
                    <option value="disease">Enfermedad</option>
                    <option value="surgery">Cirugía</option>
                    <option value="treatment">Tratamiento</option>
                    <option value="other">Otro</option>
                  </select>
                  <input className="rounded-lg border border-cyan-200 px-2 py-1.5" value={recordEdit.title} onChange={(e) => setRecordEdit({ ...recordEdit, title: e.target.value })} />
                  <input type="date" className="rounded-lg border border-cyan-200 px-2 py-1.5" value={recordEdit.occurred_at} onChange={(e) => setRecordEdit({ ...recordEdit, occurred_at: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => saveRecord(r.id)}><Check size={12} /> Guardar</button>
                    <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditingRecordId(null)}><X size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="rounded bg-cyan-100 px-2 py-0.5 text-xs font-medium uppercase text-cyan-800">{r.record_type}</span>
                    <strong className="ml-2 text-cyan-900">{r.title}</strong>
                    <span className="text-cyan-600"> · {r.occurred_at}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800" onClick={() => { setEditingRecordId(r.id); setRecordEdit({ record_type: r.record_type, title: r.title, occurred_at: r.occurred_at }) }}>
                      <Pencil size={12} /> Editar
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700" onClick={() => deleteRecord(r.id)}>
                      <Trash2 size={12} /> Borrar
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
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950">
          <CalendarDays size={18} /> Calendario / recordatorios
        </h2>
        <form onSubmit={addEvent} className="grid gap-2 rounded-xl border border-cyan-100 bg-white p-4 sm:grid-cols-4">
          <select className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" value={eventForm.event_type} onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}>
            <option value="appointment">Cita</option>
            <option value="vaccine">Vacuna</option>
            <option value="medicine">Medicina</option>
            <option value="other">Otro</option>
          </select>
          <input className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" placeholder="Título" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
          <input type="datetime-local" className="rounded-lg border border-cyan-200 px-3 py-2 text-sm" value={eventForm.scheduled_at} onChange={(e) => setEventForm({ ...eventForm, scheduled_at: e.target.value })} required />
          <button type="submit" className="btn-primary text-sm"><Plus size={14} /> Añadir</button>
        </form>
        <ul className="space-y-2">
          {events.length === 0 && <li className="text-sm text-cyan-600">Sin recordatorios todavía.</li>}
          {events.map((ev) => (
            <li key={ev.id} className="rounded-xl border border-cyan-100 bg-white px-4 py-3 text-sm">
              {editingEventId === ev.id ? (
                <div className="grid gap-2 sm:grid-cols-4">
                  <select className="rounded-lg border border-cyan-200 px-2 py-1.5" value={eventEdit.event_type} onChange={(e) => setEventEdit({ ...eventEdit, event_type: e.target.value })}>
                    <option value="appointment">Cita</option>
                    <option value="vaccine">Vacuna</option>
                    <option value="medicine">Medicina</option>
                    <option value="other">Otro</option>
                  </select>
                  <input className="rounded-lg border border-cyan-200 px-2 py-1.5" value={eventEdit.title} onChange={(e) => setEventEdit({ ...eventEdit, title: e.target.value })} />
                  <input type="datetime-local" className="rounded-lg border border-cyan-200 px-2 py-1.5" value={eventEdit.scheduled_at} onChange={(e) => setEventEdit({ ...eventEdit, scheduled_at: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => saveEvent(ev.id)}><Check size={12} /> Guardar</button>
                    <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditingEventId(null)}><X size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-medium uppercase text-teal-800">{ev.event_type}</span>
                    <strong className="ml-2 text-cyan-900">{ev.title}</strong>
                    <span className="text-cyan-600"> · {new Date(ev.scheduled_at).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800" onClick={() => { setEditingEventId(ev.id); setEventEdit({ event_type: ev.event_type, title: ev.title, scheduled_at: toLocalInput(ev.scheduled_at), completed: ev.completed }) }}>
                      <Pencil size={12} /> Editar
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700" onClick={() => deleteEvent(ev.id)}>
                      <Trash2 size={12} /> Borrar
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

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
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const emptyEdit = {
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
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(emptyEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [vaccineForm, setVaccineForm] = useState({
    name: '',
    administered_at: '',
    next_due_at: '',
  })
  const [recordForm, setRecordForm] = useState({
    record_type: 'exam',
    title: '',
    occurred_at: '',
    description: '',
  })
  const [eventForm, setEventForm] = useState({
    event_type: 'appointment',
    title: '',
    scheduled_at: '',
    description: '',
  })

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
    const payload = {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || null,
      birth_date: form.birth_date || null,
      chip_id: form.chip_id.trim() || null,
      weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg),
      allergies: form.allergies.trim() || null,
    }
    const res = await fetch(`${API_URL}/api/pets/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(typeof err.detail === 'string' ? err.detail : 'No se pudo guardar')
      return
    }
    const updated = await res.json()
    setPet(updated)
    setEditing(false)
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
    if (!res.ok) {
      alert('No se pudo añadir la vacuna')
      return
    }
    setVaccineForm({ name: '', administered_at: '', next_due_at: '' })
    await load()
  }

  async function addRecord(e) {
    e.preventDefault()
    const res = await fetch(`${API_URL}/api/pets/${id}/records`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        record_type: recordForm.record_type,
        title: recordForm.title,
        occurred_at: recordForm.occurred_at,
        description: recordForm.description || null,
      }),
    })
    if (!res.ok) {
      alert('No se pudo añadir el registro')
      return
    }
    setRecordForm({ record_type: 'exam', title: '', occurred_at: '', description: '' })
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
        description: eventForm.description || null,
      }),
    })
    if (!res.ok) {
      alert('No se pudo añadir el recordatorio')
      return
    }
    setEventForm({ event_type: 'appointment', title: '', scheduled_at: '', description: '' })
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
              setEditing((v) => !v)
              setError('')
            }}
          >
            <Pencil size={14} /> {editing ? 'Cancelar' : 'Editar datos'}
          </button>
        </div>

        {!editing && (
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

        {editing && (
          <form onSubmit={savePet} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <select
              className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
              value={form.species}
              onChange={(e) => setForm({ ...form, species: e.target.value })}
            >
              <option value="dog">Perro</option>
              <option value="cat">Gato</option>
              <option value="other">Otro</option>
            </select>
            <input
              className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
              placeholder="Raza"
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
            />
            <input
              type="date"
              className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
            <input
              className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
              placeholder="Nº chip (puedes añadirlo después)"
              value={form.chip_id}
              onChange={(e) => setForm({ ...form, chip_id: e.target.value })}
            />
            <input
              type="number"
              step="0.1"
              className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
              placeholder="Peso (kg)"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
            />
            <textarea
              className="rounded-lg border border-cyan-200 px-3 py-2 text-sm sm:col-span-2"
              placeholder="Alergias"
              rows={2}
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
            />
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <button type="submit" className="btn-primary sm:col-span-2" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link to={`/pets/${id}/log`} className="btn-secondary text-sm">Diario</Link>
          <Link to={`/pets/${id}/vet-access`} className="btn-primary text-sm">Acceso vet (QR/PIN)</Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950">
          <Syringe size={18} /> Vacunas
        </h2>
        <form onSubmit={addVaccine} className="grid gap-2 rounded-xl border border-cyan-100 bg-white p-4 sm:grid-cols-4">
          <input
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm sm:col-span-1"
            placeholder="Nombre vacuna"
            value={vaccineForm.name}
            onChange={(e) => setVaccineForm({ ...vaccineForm, name: e.target.value })}
            required
          />
          <input
            type="date"
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
            value={vaccineForm.administered_at}
            onChange={(e) => setVaccineForm({ ...vaccineForm, administered_at: e.target.value })}
            required
          />
          <input
            type="date"
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
            value={vaccineForm.next_due_at}
            onChange={(e) => setVaccineForm({ ...vaccineForm, next_due_at: e.target.value })}
            title="Próxima dosis"
          />
          <button type="submit" className="btn-primary text-sm">
            <Plus size={14} /> Añadir
          </button>
        </form>
        <ul className="space-y-2">
          {vaccines.length === 0 && <li className="text-sm text-cyan-600">Sin vacunas registradas.</li>}
          {vaccines.map((v) => (
            <li key={v.id} className="rounded-xl border border-cyan-100 bg-white px-4 py-3 text-sm">
              <strong className="text-cyan-900">{v.name}</strong>
              <span className="text-cyan-600"> · {v.administered_at}</span>
              {v.next_due_at && <span className="text-cyan-500"> · próxima {v.next_due_at}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950">
          <FileText size={18} /> Historial médico
        </h2>
        <form onSubmit={addRecord} className="grid gap-2 rounded-xl border border-cyan-100 bg-white p-4 sm:grid-cols-4">
          <select
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
            value={recordForm.record_type}
            onChange={(e) => setRecordForm({ ...recordForm, record_type: e.target.value })}
          >
            <option value="exam">Examen</option>
            <option value="disease">Enfermedad</option>
            <option value="surgery">Cirugía</option>
            <option value="treatment">Tratamiento</option>
            <option value="other">Otro</option>
          </select>
          <input
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
            placeholder="Título"
            value={recordForm.title}
            onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
            required
          />
          <input
            type="date"
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
            value={recordForm.occurred_at}
            onChange={(e) => setRecordForm({ ...recordForm, occurred_at: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary text-sm">
            <Plus size={14} /> Añadir
          </button>
        </form>
        <ul className="space-y-2">
          {records.length === 0 && <li className="text-sm text-cyan-600">Sin registros médicos.</li>}
          {records.map((r) => (
            <li key={r.id} className="rounded-xl border border-cyan-100 bg-white px-4 py-3 text-sm">
              <span className="rounded bg-cyan-100 px-2 py-0.5 text-xs font-medium uppercase text-cyan-800">
                {r.record_type}
              </span>
              <strong className="ml-2 text-cyan-900">{r.title}</strong>
              <span className="text-cyan-600"> · {r.occurred_at}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950">
          <CalendarDays size={18} /> Calendario / recordatorios
        </h2>
        <p className="text-sm text-cyan-700/80">
          Disponible en Free y Pro. Las alertas automatizadas por email/push son parte del plan Pro.
        </p>
        <form onSubmit={addEvent} className="grid gap-2 rounded-xl border border-cyan-100 bg-white p-4 sm:grid-cols-4">
          <select
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
            value={eventForm.event_type}
            onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
          >
            <option value="appointment">Cita</option>
            <option value="vaccine">Vacuna</option>
            <option value="medicine">Medicina</option>
            <option value="other">Otro</option>
          </select>
          <input
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
            placeholder="Título"
            value={eventForm.title}
            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            required
          />
          <input
            type="datetime-local"
            className="rounded-lg border border-cyan-200 px-3 py-2 text-sm"
            value={eventForm.scheduled_at}
            onChange={(e) => setEventForm({ ...eventForm, scheduled_at: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary text-sm">
            <Plus size={14} /> Añadir
          </button>
        </form>
        <ul className="space-y-2">
          {events.length === 0 && <li className="text-sm text-cyan-600">Sin recordatorios todavía.</li>}
          {events.map((ev) => (
            <li key={ev.id} className="rounded-xl border border-cyan-100 bg-white px-4 py-3 text-sm">
              <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-medium uppercase text-teal-800">
                {ev.event_type}
              </span>
              <strong className="ml-2 text-cyan-900">{ev.title}</strong>
              <span className="text-cyan-600"> · {new Date(ev.scheduled_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

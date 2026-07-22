import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, PawPrint, Syringe, BookOpen, QrCode } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function Dashboard() {
  const [pets, setPets] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', species: 'dog', breed: '', chip_id: '' })
  const user = JSON.parse(localStorage.getItem('profipaws_user') || 'null')

  useEffect(() => {
    async function load() {
      try {
        const [petsRes, subRes] = await Promise.all([
          fetch(`${API_URL}/api/pets`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/subscriptions/me`, { headers: authHeaders() }),
        ])
        if (petsRes.ok) setPets(await petsRes.json())
        if (subRes.ok) setSubscription(await subRes.json())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function createPet(e) {
    e.preventDefault()
    const res = await fetch(`${API_URL}/api/pets`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'No se pudo crear la mascota')
      return
    }
    const pet = await res.json()
    setPets((prev) => [...prev, pet])
    setShowForm(false)
    setForm({ name: '', species: 'dog', breed: '', chip_id: '' })
  }

  if (loading) {
    return <p className="text-cyan-700">Cargando dashboard…</p>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-cyan-950">
            Hola{user?.full_name ? `, ${user.full_name}` : ''}
          </h1>
          <p className="mt-1 text-cyan-700/80">
            Plan {subscription?.tier === 'pro' ? 'Pro' : 'Gratuito'} · gestiona el pasaporte de tus mascotas
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> Nueva mascota
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPet} className="grid gap-3 rounded-2xl border border-cyan-100 bg-white p-5 sm:grid-cols-2">
          <input
            className="rounded-lg border border-cyan-200 px-3 py-2"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            className="rounded-lg border border-cyan-200 px-3 py-2"
            value={form.species}
            onChange={(e) => setForm({ ...form, species: e.target.value })}
          >
            <option value="dog">Perro</option>
            <option value="cat">Gato</option>
            <option value="other">Otro</option>
          </select>
          <input
            className="rounded-lg border border-cyan-200 px-3 py-2"
            placeholder="Raza"
            value={form.breed}
            onChange={(e) => setForm({ ...form, breed: e.target.value })}
          />
          <input
            className="rounded-lg border border-cyan-200 px-3 py-2"
            placeholder="Nº chip"
            value={form.chip_id}
            onChange={(e) => setForm({ ...form, chip_id: e.target.value })}
          />
          <button type="submit" className="btn-primary sm:col-span-2">
            Guardar
          </button>
        </form>
      )}

      {pets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-200 bg-white/60 py-16 text-center">
          <PawPrint className="mx-auto text-cyan-400" size={40} />
          <p className="mt-3 text-cyan-800">Aún no tienes mascotas registradas.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <li key={pet.id} className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm shadow-cyan-900/5">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                  <PawPrint size={22} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-cyan-950">{pet.name}</h2>
                  <p className="text-sm text-cyan-700/70">
                    {pet.species}
                    {pet.breed ? ` · ${pet.breed}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <Link to={`/pets/${pet.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                  Perfil
                </Link>
                <Link to={`/pets/${pet.id}/log`} className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-3 py-1.5 text-cyan-800">
                  <BookOpen size={12} /> Diario
                </Link>
                <Link to={`/pets/${pet.id}/vet-access`} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-teal-800">
                  <QrCode size={12} /> Vet PIN
                </Link>
                <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-3 py-1.5 text-cyan-700">
                  <Syringe size={12} /> Historial
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

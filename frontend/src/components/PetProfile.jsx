import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Weight, AlertTriangle, Cpu } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function PetProfile() {
  const { id } = useParams()
  const [pet, setPet] = useState(null)
  const [vaccines, setVaccines] = useState([])
  const [records, setRecords] = useState([])

  useEffect(() => {
    async function load() {
      const [petRes, vacRes, recRes] = await Promise.all([
        fetch(`${API_URL}/api/pets/${id}`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/pets/${id}/vaccines`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/pets/${id}/records`, { headers: authHeaders() }),
      ])
      if (petRes.ok) setPet(await petRes.json())
      if (vacRes.ok) setVaccines(await vacRes.json())
      if (recRes.ok) setRecords(await recRes.json())
    }
    load()
  }, [id])

  if (!pet) return <p className="text-cyan-700">Cargando perfil…</p>

  return (
    <div className="space-y-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900">
        <ArrowLeft size={14} /> Volver
      </Link>

      <div className="rounded-2xl border border-cyan-100 bg-white p-6">
        <h1 className="font-display text-3xl font-bold text-cyan-950">{pet.name}</h1>
        <p className="mt-1 text-cyan-700">
          {pet.species}
          {pet.breed ? ` · ${pet.breed}` : ''}
          {pet.birth_date ? ` · nacido ${pet.birth_date}` : ''}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-cyan-800">
          {pet.weight_kg != null && (
            <span className="inline-flex items-center gap-1.5">
              <Weight size={14} /> {pet.weight_kg} kg
            </span>
          )}
          {pet.chip_id && (
            <span className="inline-flex items-center gap-1.5">
              <Cpu size={14} /> Chip {pet.chip_id}
            </span>
          )}
          {pet.allergies && (
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <AlertTriangle size={14} /> {pet.allergies}
            </span>
          )}
        </div>
        <div className="mt-5 flex gap-2">
          <Link to={`/pets/${id}/log`} className="btn-secondary text-sm">Diario</Link>
          <Link to={`/pets/${id}/vet-access`} className="btn-primary text-sm">Acceso vet (QR/PIN)</Link>
        </div>
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold text-cyan-950">Vacunas</h2>
        <ul className="mt-3 space-y-2">
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

      <section>
        <h2 className="font-display text-xl font-semibold text-cyan-950">Historial médico</h2>
        <ul className="mt-3 space-y-2">
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
    </div>
  )
}

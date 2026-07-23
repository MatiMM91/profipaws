import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
    const payload = {
      name: form.name,
      species: form.species,
      breed: form.breed || null,
      chip_id: form.chip_id || null,
    }
    const res = await fetch(`${API_URL}/api/pets`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || t('dashboard.createError'))
      return
    }
    const pet = await res.json()
    setPets((prev) => [...prev, pet])
    setShowForm(false)
    setForm({ name: '', species: 'dog', breed: '', chip_id: '' })
  }

  if (loading) {
    return <p className="text-cyan-700 dark:text-cyan-300">{t('dashboard.loading')}</p>
  }

  const planLabel = subscription?.tier === 'pro' || subscription?.tier === 'PRO'
    ? t('dashboard.planPro')
    : t('dashboard.planFree')

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-cyan-950 dark:text-cyan-50">
            {t('dashboard.hello')}{user?.full_name ? `, ${user.full_name}` : ''}
          </h1>
          <p className="mt-1 text-cyan-700/80 dark:text-cyan-300/80">
            {planLabel} · {t('dashboard.subtitle')}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> {t('dashboard.newPet')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPet} className="surface grid gap-3 p-5 sm:grid-cols-2">
          <input className="field" placeholder={t('dashboard.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="field" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
            <option value="dog">{t('dashboard.dog')}</option>
            <option value="cat">{t('dashboard.cat')}</option>
            <option value="other">{t('dashboard.other')}</option>
          </select>
          <input className="field" placeholder={t('dashboard.breed')} value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          <input className="field" placeholder={t('dashboard.chip')} value={form.chip_id} onChange={(e) => setForm({ ...form, chip_id: e.target.value })} />
          <button type="submit" className="btn-primary sm:col-span-2">{t('dashboard.save')}</button>
        </form>
      )}

      {pets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-200 bg-white/60 py-16 text-center dark:border-cyan-800 dark:bg-cyan-900/20">
          <PawPrint className="mx-auto text-cyan-400" size={40} />
          <p className="mt-3 text-cyan-800 dark:text-cyan-200">{t('dashboard.empty')}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <li key={pet.id} className="surface p-5 shadow-sm shadow-cyan-900/5">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-100">
                  <PawPrint size={22} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-cyan-950 dark:text-cyan-50">{pet.name}</h2>
                  <p className="text-sm text-cyan-700/70 dark:text-cyan-300/70">
                    {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <Link to={`/pets/${pet.id}`} className="btn-secondary px-3 py-1.5 text-xs">{t('dashboard.profile')}</Link>
                <Link to={`/pets/${pet.id}/log`} className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-3 py-1.5 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100">
                  <BookOpen size={12} /> {t('dashboard.diary')}
                </Link>
                <Link to={`/pets/${pet.id}/vet-access`} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-teal-800 dark:bg-teal-900/50 dark:text-teal-100">
                  <QrCode size={12} /> {t('dashboard.vetPin')}
                </Link>
                <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-3 py-1.5 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200">
                  <Syringe size={12} /> {t('dashboard.history')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

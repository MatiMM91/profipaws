import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, PawPrint, Syringe, QrCode, Users, Bell, Weight, ShieldCheck } from 'lucide-react'
import SpeciesIcon, { SPECIES_OPTIONS } from './SpeciesIcon'
import { authHeaders, getStoredUser, getToken, handleAuthFailure } from '../auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const FREE_PET_LIMIT = 5

function parseApiDate(iso) {
  if (!iso) return null
  const s = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`
  return new Date(s)
}

function formatDue(iso, locale) {
  if (!iso) return ''
  // date-only vaccine dues
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(locale)
  }
  const d = parseApiDate(iso)
  if (!d || Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString(locale)
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [pets, setPets] = useState([])
  const [alerts, setAlerts] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', species: 'dog', breed: '', chip_id: '' })
  const [saving, setSaving] = useState(false)
  const user = getStoredUser()

  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'PRO'
  const ownedCount = useMemo(() => pets.filter((p) => p.my_role === 'owner').length, [pets])
  const atFreeLimit = !isPro && ownedCount >= FREE_PET_LIMIT

  useEffect(() => {
    async function load() {
      try {
        const [petsRes, subRes, alertRes] = await Promise.all([
          fetch(`${API_URL}/api/pets`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/subscriptions/me`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/alerts/upcoming?days=14`, { headers: authHeaders() }),
        ])
        if (petsRes.status === 401 || subRes.status === 401) {
          handleAuthFailure(401)
          return
        }
        if (petsRes.ok) setPets(await petsRes.json())
        if (subRes.ok) setSubscription(await subRes.json())
        if (alertRes.ok) {
          const data = await alertRes.json()
          setAlerts(data.items || [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function createPet(e) {
    e.preventDefault()
    if (!getToken()) {
      alert(t('dashboard.sessionRequired'))
      handleAuthFailure(401)
      return
    }
    if (atFreeLimit) {
      alert(t('dashboard.freeLimitReached'))
      return
    }
    setSaving(true)
    const payload = {
      name: form.name,
      species: form.species,
      breed: form.breed || null,
      chip_id: form.chip_id || null,
    }
    try {
      const res = await fetch(`${API_URL}/api/pets`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      if (res.status === 401) {
        alert(t('dashboard.sessionExpired'))
        handleAuthFailure(401)
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(typeof err.detail === 'string' ? err.detail : t('dashboard.createError'))
        return
      }
      const pet = await res.json()
      setPets((prev) => [pet, ...prev])
      setShowForm(false)
      setForm({ name: '', species: 'dog', breed: '', chip_id: '' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-cyan-700 dark:text-cyan-300">{t('dashboard.loading')}</p>
  }

  const planLabel = isPro ? t('dashboard.planPro') : t('dashboard.planFree')

  function nextAlertFor(petId) {
    return alerts.find((a) => String(a.pet_id) === String(petId)) || null
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-cyan-950 dark:text-cyan-50">
            {t('dashboard.hello')}{user?.full_name ? `, ${user.full_name}` : ''}
          </h1>
          <p className="mt-1 text-cyan-700/80 dark:text-cyan-300/80">
            {planLabel} · {t('dashboard.subtitle')}
            {!isPro && (
              <span className="ml-1 text-cyan-600/80 dark:text-cyan-400/80">
                · {t('dashboard.petSlots', { used: ownedCount, max: FREE_PET_LIMIT })}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (atFreeLimit) {
              navigate('/pricing')
              return
            }
            setShowForm((v) => !v)
          }}
        >
          <Plus size={16} /> {atFreeLimit ? t('dashboard.upgradeForMore') : t('dashboard.newPet')}
        </button>
      </div>

      {alerts.length > 0 && (
        <section className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            <Bell size={13} /> {t('dashboard.upcomingTitle')}
          </p>
          <ul className="space-y-1.5">
            {alerts.slice(0, 6).map((a) => (
              <li key={`${a.kind}-${a.id}`}>
                <Link
                  to={`/pets/${a.pet_id}${a.kind === 'vaccine' ? '#historial' : '#calendario'}`}
                  className="text-sm text-amber-950 hover:underline dark:text-amber-50"
                >
                  <span className="font-medium">{a.pet_name}</span>
                  {' · '}
                  {a.title}
                  <span className="text-amber-700/80 dark:text-amber-300/80">
                    {' · '}
                    {formatDue(a.due_at, i18n.language)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showForm && !atFreeLimit && (
        <form onSubmit={createPet} className="surface grid gap-3 p-5 sm:grid-cols-2">
          <input className="field" placeholder={t('dashboard.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="field" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
            {SPECIES_OPTIONS.map((key) => (
              <option key={key} value={key}>{t(`dashboard.${key}`)}</option>
            ))}
          </select>
          <input className="field" placeholder={t('dashboard.breed')} value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          <input className="field" placeholder={t('dashboard.chip')} value={form.chip_id} onChange={(e) => setForm({ ...form, chip_id: e.target.value })} />
          <button type="submit" className="btn-primary sm:col-span-2" disabled={saving}>
            {saving ? t('dashboard.saving') : t('dashboard.save')}
          </button>
        </form>
      )}

      {pets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-200 bg-white/60 py-16 text-center dark:border-cyan-800 dark:bg-cyan-900/20">
          <PawPrint className="mx-auto text-cyan-400" size={40} />
          <p className="mt-3 text-cyan-800 dark:text-cyan-200">{t('dashboard.empty')}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-cyan-600 dark:text-cyan-400">{t('dashboard.emptyHint')}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => {
            const next = nextAlertFor(pet.id)
            return (
              <li key={pet.id}>
                <div
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/pets/${pet.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/pets/${pet.id}`)
                    }
                  }}
                  className="surface cursor-pointer p-5 shadow-sm shadow-cyan-900/5 transition hover:border-cyan-300 dark:hover:border-cyan-600"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-100">
                      <SpeciesIcon species={pet.species} size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg font-semibold text-cyan-950 dark:text-cyan-50">{pet.name}</h2>
                        {pet.my_role && pet.my_role !== 'owner' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">
                            <Users size={10} />
                            {pet.my_role === 'edit' ? t('share.canEdit') : t('share.canRead')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-cyan-700/70 dark:text-cyan-300/70">
                        {t(`dashboard.${pet.species}`, { defaultValue: pet.species })}{pet.breed ? ` · ${pet.breed}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-cyan-50/90 px-2.5 py-2 dark:bg-cyan-900/50">
                      <p className="inline-flex items-center gap-1 font-medium text-cyan-700 dark:text-cyan-300">
                        <Weight size={11} /> {t('dashboard.tileWeight')}
                      </p>
                      <p className="mt-0.5 text-cyan-950 dark:text-cyan-50">
                        {pet.weight_kg != null ? `${pet.weight_kg} kg` : t('dashboard.tileEmpty')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-cyan-50/90 px-2.5 py-2 dark:bg-cyan-900/50">
                      <p className="inline-flex items-center gap-1 font-medium text-cyan-700 dark:text-cyan-300">
                        <Bell size={11} /> {t('dashboard.tileNext')}
                      </p>
                      <p className="mt-0.5 truncate text-cyan-950 dark:text-cyan-50">
                        {next
                          ? `${next.title} · ${formatDue(next.due_at, i18n.language)}`
                          : t('dashboard.tileEmpty')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/pets/${pet.id}`} className="btn-secondary px-3 py-1.5 text-xs">{t('dashboard.profile')}</Link>
                    {pet.my_role === 'owner' && (
                      <Link to={`/pets/${pet.id}/vet-access`} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-teal-800 dark:bg-teal-900/50 dark:text-teal-100">
                        <QrCode size={12} /> {t('dashboard.vetPin')}
                      </Link>
                    )}
                    <Link to={`/pets/${pet.id}#historial`} className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-3 py-1.5 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100">
                      <Syringe size={12} /> {t('dashboard.history')}
                    </Link>
                    <Link to={`/pets/${pet.id}#herramientas`} className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-3 py-1.5 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100">
                      <ShieldCheck size={12} /> {t('dashboard.pass')}
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

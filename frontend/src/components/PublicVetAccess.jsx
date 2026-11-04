import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, FileText, PawPrint, Shield } from 'lucide-react'
import BrandLogo from './BrandLogo'
import PreferenceControls from './PreferenceControls'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function PublicVetAccess() {
  const { pin } = useParams()
  const { t, i18n } = useTranslation()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [sessionMode, setSessionMode] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const hashToken = (window.location.hash || '').replace(/^#/, '').trim()
        let useSession = !pin
        if (hashToken) {
          const exchanged = await fetch(`${API_URL}/api/pets/access/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token: hashToken }),
          })
          if (!exchanged.ok) throw new Error(t('vetAccess.invalid'))
          window.history.replaceState(null, '', '/vet')
          useSession = true
        }
        const url = useSession
          ? `${API_URL}/api/pets/access/session`
          : `${API_URL}/api/pets/access/${encodeURIComponent(pin)}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(t('vetAccess.invalid'))
        const json = await res.json()
        if (!cancelled) {
          setData(json)
          setSessionMode(useSession)
        }
      } catch (e) {
        if (!cancelled) setError(e.message || t('vetAccess.invalid'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [pin, t])

  const pet = data?.pet
  const locale = i18n.language
  const allRecords = data?.medical_records || []
  const examRecords = allRecords.filter((r) => String(r.record_type || '').toLowerCase() === 'exam')
  const historyRecords = allRecords.filter((r) => String(r.record_type || '').toLowerCase() !== 'exam')

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 dark:from-cyan-950 dark:via-slate-950 dark:to-teal-950">
      <header className="border-b border-cyan-100/80 bg-white/70 px-4 py-3 backdrop-blur-md dark:border-cyan-900/60 dark:bg-cyan-950/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 font-display text-lg font-bold text-cyan-900 dark:text-cyan-50">
            <BrandLogo className="h-9 w-9" />
            Profipaws
          </div>
          <PreferenceControls />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-100">
            <Shield size={20} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-cyan-950 dark:text-cyan-50">
              {t('vetAccess.title')}
            </h1>
            <p className="mt-1 text-sm text-cyan-700/80 dark:text-cyan-300/80">{t('vetAccess.subtitle')}</p>
          </div>
        </div>

        {loading && (
          <p className="text-cyan-700 dark:text-cyan-300">{t('common.loading')}</p>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-50">
            <p className="inline-flex items-center gap-2 font-semibold">
              <AlertTriangle size={16} /> {error}
            </p>
            <p className="mt-2 text-sm text-amber-800/90 dark:text-amber-100/80">{t('vetAccess.invalidHint')}</p>
            <Link to="/" className="btn-secondary mt-4 inline-flex text-sm">
              {t('pricing.backHome')}
            </Link>
          </div>
        )}

        {!loading && pet && (
          <div className="space-y-5">
            <section className="surface p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-100">
                  <PawPrint size={22} />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-cyan-950 dark:text-cyan-50">{pet.name}</h2>
                  <p className="text-sm text-cyan-700/80 dark:text-cyan-300/80">
                    {[pet.species, pet.breed, pet.color, pet.chip_id ? `chip ${pet.chip_id}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="mt-1 text-sm text-cyan-800 dark:text-cyan-200">
                    {[
                      pet.birth_date ? `${t('vetAccess.birth')}: ${pet.birth_date}` : null,
                      pet.weight_kg != null ? `${t('vetAccess.weight')}: ${pet.weight_kg} kg` : null,
                      pet.allergies ? `${t('vetAccess.allergies')}: ${pet.allergies}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
            </section>

            <Section title={t('vetAccess.vaccines')}>
              {(data.vaccines || []).length === 0 ? (
                <Empty />
              ) : (
                <ul className="space-y-2">
                  {data.vaccines.map((v) => (
                    <li key={v.id} className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm dark:border-cyan-800 dark:bg-cyan-900/40">
                      <strong className="text-cyan-950 dark:text-cyan-50">{v.name}</strong>
                      <p className="text-cyan-700/80 dark:text-cyan-300/80">
                        {[v.brand, v.code, v.administered_at, v.next_due_at ? `→ ${v.next_due_at}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={t('vetAccess.conditions')}>
              {(data.chronic_conditions || []).length === 0 ? (
                <Empty />
              ) : (
                <ul className="space-y-2">
                  {data.chronic_conditions.map((c) => (
                    <li key={c.id} className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm dark:border-cyan-800 dark:bg-cyan-900/40">
                      <strong className="text-cyan-950 dark:text-cyan-50">{c.name}</strong>
                      {c.notes && <p className="mt-1 whitespace-pre-wrap text-cyan-800 dark:text-cyan-200">{c.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={t('vetAccess.records')}>
              {historyRecords.length === 0 ? (
                <Empty />
              ) : (
                <RecordList records={historyRecords} />
              )}
            </Section>

            <Section title={t('vetAccess.exams')}>
              {examRecords.length === 0 ? (
                <Empty />
              ) : (
                <RecordList records={examRecords} pin={pin} sessionMode={sessionMode} />
              )}
            </Section>

            <Section title={t('vetAccess.consultations')}>
              {(data.consultations || []).length === 0 ? (
                <Empty />
              ) : (
                <ul className="space-y-2">
                  {data.consultations.map((c) => (
                    <li key={c.id} className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm dark:border-cyan-800 dark:bg-cyan-900/40">
                      <strong className="text-cyan-950 dark:text-cyan-50">{c.treating_doctor}</strong>
                      <p className="text-cyan-700/80 dark:text-cyan-300/80">
                        {[c.specialty, c.consulted_at].filter(Boolean).join(' · ')}
                      </p>
                      {c.reason && <p className="mt-1 text-cyan-800 dark:text-cyan-200">{c.reason}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <p className="text-center text-xs text-cyan-600 dark:text-cyan-400">
              {t('vetAccess.footer', { time: new Date().toLocaleString(locale) })}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
        {title}
      </h3>
      {children}
    </section>
  )
}

function RecordList({ records, pin, sessionMode }) {
  const { t } = useTranslation()
  return (
    <ul className="space-y-2">
      {records.map((r) => {
        const docUrl = !r.has_document
          ? null
          : sessionMode
            ? `${API_URL}/api/pets/access/session/records/${r.id}/document`
            : pin
              ? `${API_URL}/api/pets/access/${encodeURIComponent(pin)}/records/${r.id}/document`
              : null
        return (
          <li
            key={r.id}
            className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm dark:border-cyan-800 dark:bg-cyan-900/40"
          >
            <strong className="text-cyan-950 dark:text-cyan-50">{r.title}</strong>
            <p className="text-cyan-700/80 dark:text-cyan-300/80">
              {[r.record_type, r.occurred_at].filter(Boolean).join(' · ')}
            </p>
            {r.description && (
              <p className="mt-1 whitespace-pre-wrap text-cyan-800 dark:text-cyan-200">{r.description}</p>
            )}
            {docUrl && (
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 transition hover:bg-teal-100 dark:bg-teal-900/40 dark:text-teal-100 dark:hover:bg-teal-900/70"
              >
                <FileText size={12} />
                {r.document_filename || t('vetAccess.openDocument')}
              </a>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Empty() {
  const { t } = useTranslation()
  return <p className="text-sm text-cyan-600 dark:text-cyan-400">{t('vetAccess.empty')}</p>
}

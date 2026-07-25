import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Stethoscope, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, NotebookPen } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('profipaws_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const emptyForm = {
  treating_doctor: '',
  specialty: '',
  reason: '',
  treatment: '',
  treatment_changes: '',
  consulted_at: '',
}

const emptyNote = { note: '', noted_at: '' }

function Field({ label, value, onChange, textarea, required }) {
  const cls = 'field w-full px-3 py-2 text-sm'
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">{label}</span>
      {textarea ? (
        <textarea className={cls} rows={2} value={value} onChange={onChange} required={required} />
      ) : (
        <input className={cls} value={value} onChange={onChange} required={required} />
      )}
    </label>
  )
}

function ConsultationFormFields({ t, values, setValues, onSubmit, onCancel, submitLabel }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-cyan-100 bg-white p-4 dark:border-cyan-800 dark:bg-cyan-900/40 sm:grid-cols-2">
      <Field label={t('seguimiento.doctor')} value={values.treating_doctor} onChange={(e) => setValues({ ...values, treating_doctor: e.target.value })} required />
      <Field label={t('seguimiento.specialty')} value={values.specialty} onChange={(e) => setValues({ ...values, specialty: e.target.value })} />
      <label className="block space-y-1">
        <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">{t('seguimiento.date')}</span>
        <input type="date" className="field w-full px-3 py-2 text-sm" value={values.consulted_at} onChange={(e) => setValues({ ...values, consulted_at: e.target.value })} required />
      </label>
      <div className="sm:col-span-2">
        <Field label={t('seguimiento.reason')} value={values.reason} onChange={(e) => setValues({ ...values, reason: e.target.value })} textarea />
      </div>
      <div className="sm:col-span-2">
        <Field label={t('seguimiento.treatment')} value={values.treatment} onChange={(e) => setValues({ ...values, treatment: e.target.value })} textarea />
      </div>
      <div className="sm:col-span-2">
        <Field label={t('seguimiento.treatmentChanges')} value={values.treatment_changes} onChange={(e) => setValues({ ...values, treatment_changes: e.target.value })} textarea />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className="btn-primary text-sm">{submitLabel}</button>
        {onCancel && (
          <button type="button" className="btn-secondary text-sm" onClick={onCancel}>
            <X size={14} /> {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  )
}

export default function PetConsultations({ petId, canEdit, hideTitle = false }) {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [openId, setOpenId] = useState(null)
  const [noteForm, setNoteForm] = useState(emptyNote)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteEdit, setNoteEdit] = useState(emptyNote)

  async function load() {
    const res = await fetch(`${API_URL}/api/pets/${petId}/consultations`, { headers: authHeaders() })
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => {
    load()
  }, [petId])

  async function addItem(e) {
    e.preventDefault()
    const res = await fetch(`${API_URL}/api/pets/${petId}/consultations`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        treating_doctor: form.treating_doctor.trim(),
        specialty: form.specialty.trim() || null,
        reason: form.reason.trim() || null,
        treatment: form.treatment.trim() || null,
        treatment_changes: form.treatment_changes.trim() || null,
        consulted_at: form.consulted_at,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(typeof err.detail === 'string' ? err.detail : t('seguimiento.saveError'))
      return
    }
    setForm(emptyForm)
    setShowForm(false)
    await load()
  }

  async function saveItem(id) {
    const res = await fetch(`${API_URL}/api/pets/${petId}/consultations/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        treating_doctor: editForm.treating_doctor.trim(),
        specialty: editForm.specialty.trim() || null,
        reason: editForm.reason.trim() || null,
        treatment: editForm.treatment.trim() || null,
        treatment_changes: editForm.treatment_changes.trim() || null,
        consulted_at: editForm.consulted_at,
      }),
    })
    if (!res.ok) return alert(t('seguimiento.saveError'))
    setEditingId(null)
    await load()
  }

  async function deleteItem(id) {
    if (!confirm(t('seguimiento.deleteConfirm'))) return
    const res = await fetch(`${API_URL}/api/pets/${petId}/consultations/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) return alert(t('seguimiento.saveError'))
    await load()
  }

  async function addNote(consultationId, e) {
    e.preventDefault()
    const res = await fetch(`${API_URL}/api/pets/${petId}/consultations/${consultationId}/notes`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        note: noteForm.note.trim(),
        noted_at: noteForm.noted_at,
      }),
    })
    if (!res.ok) return alert(t('seguimiento.noteSaveError'))
    setNoteForm(emptyNote)
    await load()
  }

  async function saveNote(consultationId, noteId) {
    const res = await fetch(
      `${API_URL}/api/pets/${petId}/consultations/${consultationId}/notes/${noteId}`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          note: noteEdit.note.trim(),
          noted_at: noteEdit.noted_at,
        }),
      },
    )
    if (!res.ok) return alert(t('seguimiento.noteSaveError'))
    setEditingNoteId(null)
    await load()
  }

  async function deleteNote(consultationId, noteId) {
    if (!confirm(t('seguimiento.noteDeleteConfirm'))) return
    const res = await fetch(
      `${API_URL}/api/pets/${petId}/consultations/${consultationId}/notes/${noteId}`,
      { method: 'DELETE', headers: authHeaders() },
    )
    if (!res.ok) return alert(t('seguimiento.noteSaveError'))
    await load()
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!hideTitle ? (
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950 dark:text-cyan-50">
            <Stethoscope size={18} /> {t('seguimiento.title')}
          </h2>
        ) : (
          <p className="text-sm text-cyan-700/80 dark:text-cyan-300/80">{t('seguimiento.subtitle')}</p>
        )}
        {canEdit && !showForm && editingId == null && (
          <button type="button" className="btn-secondary text-xs" onClick={() => setShowForm(true)}>
            <Plus size={12} /> {t('seguimiento.add')}
          </button>
        )}
      </div>
      {!hideTitle && (
        <p className="text-sm text-cyan-700/80 dark:text-cyan-300/80">{t('seguimiento.subtitle')}</p>
      )}

      <div className="rounded-lg border border-cyan-100 bg-cyan-50/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
        {t('seguimiento.consultations')}
      </div>

      {showForm && canEdit && (
        <ConsultationFormFields
          t={t}
          values={form}
          setValues={setForm}
          onSubmit={addItem}
          onCancel={() => {
            setShowForm(false)
            setForm(emptyForm)
          }}
          submitLabel={t('seguimiento.add')}
        />
      )}

      <ul className="space-y-2">
        {items.length === 0 && !showForm && (
          <li className="text-sm text-cyan-600 dark:text-cyan-400">{t('seguimiento.empty')}</li>
        )}
        {items.map((c) => (
          <li key={c.id} className="rounded-xl border border-cyan-100 bg-white dark:border-cyan-800 dark:bg-cyan-900/40">
            {editingId === c.id ? (
              <div className="p-3">
                <ConsultationFormFields
                  t={t}
                  values={editForm}
                  setValues={setEditForm}
                  onSubmit={(e) => {
                    e.preventDefault()
                    saveItem(c.id)
                  }}
                  onCancel={() => setEditingId(null)}
                  submitLabel={t('common.save')}
                />
              </div>
            ) : (
              <div className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    onClick={() => {
                      setOpenId((v) => (v === c.id ? null : c.id))
                      setNoteForm(emptyNote)
                      setEditingNoteId(null)
                    }}
                  >
                    {openId === c.id ? <ChevronUp size={16} className="mt-0.5 shrink-0 text-cyan-500" /> : <ChevronDown size={16} className="mt-0.5 shrink-0 text-cyan-500" />}
                    <div className="min-w-0">
                      <p className="font-medium text-cyan-950 dark:text-cyan-50">
                        {c.treating_doctor}
                        {c.specialty ? <span className="font-normal text-cyan-600 dark:text-cyan-400"> · {c.specialty}</span> : null}
                      </p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-400">
                        {c.consulted_at}
                        {(c.notes || []).length > 0 && (
                          <span> · {(c.notes || []).length} {t('seguimiento.notesCount')}</span>
                        )}
                      </p>
                    </div>
                  </button>
                  {canEdit && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800"
                        onClick={() => {
                          setEditingId(c.id)
                          setEditForm({
                            treating_doctor: c.treating_doctor || '',
                            specialty: c.specialty || '',
                            reason: c.reason || '',
                            treatment: c.treatment || '',
                            treatment_changes: c.treatment_changes || '',
                            consulted_at: c.consulted_at || '',
                          })
                        }}
                      >
                        <Pencil size={12} /> {t('common.edit')}
                      </button>
                      <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700" onClick={() => deleteItem(c.id)}>
                        <Trash2 size={12} /> {t('common.delete')}
                      </button>
                    </div>
                  )}
                </div>

                {openId === c.id && (
                  <div className="mt-3 space-y-4 border-t border-cyan-50 pt-3 dark:border-cyan-800/60">
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-cyan-600">{t('seguimiento.reason')}</dt>
                        <dd className="mt-0.5 text-cyan-900 dark:text-cyan-100">{c.reason || '—'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-cyan-600">{t('seguimiento.treatment')}</dt>
                        <dd className="mt-0.5 text-cyan-900 dark:text-cyan-100">{c.treatment || '—'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-cyan-600">{t('seguimiento.treatmentChanges')}</dt>
                        <dd className="mt-0.5 text-cyan-900 dark:text-cyan-100">{c.treatment_changes || '—'}</dd>
                      </div>
                    </dl>

                    <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                        <NotebookPen size={13} /> {t('seguimiento.evolutionNotes')}
                      </p>
                      <p className="mb-3 text-xs text-amber-800/80 dark:text-amber-200/70">{t('seguimiento.evolutionHint')}</p>

                      {canEdit && (
                        <form onSubmit={(e) => addNote(c.id, e)} className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                          <input
                            className="field px-3 py-1.5 text-sm"
                            placeholder={t('seguimiento.notePlaceholder')}
                            value={noteForm.note}
                            onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                            required
                          />
                          <input
                            type="date"
                            className="field px-3 py-1.5 text-sm"
                            value={noteForm.noted_at}
                            onChange={(e) => setNoteForm({ ...noteForm, noted_at: e.target.value })}
                            required
                          />
                          <button type="submit" className="btn-primary text-xs">
                            <Plus size={12} /> {t('seguimiento.addNote')}
                          </button>
                        </form>
                      )}

                      <ul className="space-y-2">
                        {(c.notes || []).length === 0 && (
                          <li className="text-xs text-cyan-600 dark:text-cyan-400">{t('seguimiento.notesEmpty')}</li>
                        )}
                        {(c.notes || []).map((n) => (
                          <li key={n.id} className="rounded-lg border border-amber-100/80 bg-white/80 px-3 py-2 text-sm dark:border-amber-900/40 dark:bg-cyan-950/40">
                            {editingNoteId === n.id ? (
                              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                                <input
                                  className="field px-2 py-1 text-sm"
                                  value={noteEdit.note}
                                  onChange={(e) => setNoteEdit({ ...noteEdit, note: e.target.value })}
                                />
                                <input
                                  type="date"
                                  className="field px-2 py-1 text-sm"
                                  value={noteEdit.noted_at}
                                  onChange={(e) => setNoteEdit({ ...noteEdit, noted_at: e.target.value })}
                                />
                                <div className="flex gap-1">
                                  <button type="button" className="btn-primary px-2 py-1 text-xs" onClick={() => saveNote(c.id, n.id)}>
                                    {t('common.save')}
                                  </button>
                                  <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditingNoteId(null)}>
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-cyan-950 dark:text-cyan-50">{n.note}</p>
                                  <p className="mt-0.5 text-xs text-cyan-600 dark:text-cyan-400">{n.noted_at}</p>
                                </div>
                                {canEdit && (
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      className="rounded-md bg-cyan-50 px-2 py-1 text-xs text-cyan-800"
                                      onClick={() => {
                                        setEditingNoteId(n.id)
                                        setNoteEdit({ note: n.note, noted_at: n.noted_at })
                                      }}
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700"
                                      onClick={() => deleteNote(c.id, n.id)}
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

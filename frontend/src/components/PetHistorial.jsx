import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Plus, Pencil, Trash2, Check, X, Download, Paperclip, Syringe } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TABS = [
  { id: 'vaccine', labelKey: 'historial.tabVaccines' },
  { id: 'disease', labelKey: 'historial.tabDiseases' },
  { id: 'surgery', labelKey: 'historial.tabSurgeries' },
  { id: 'exam', labelKey: 'historial.tabExams' },
  { id: 'treatment', labelKey: 'historial.tabTreatments' },
]

function authHeaders(json = true) {
  const token = localStorage.getItem('profipaws_token')
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const emptyForm = { title: '', occurred_at: '', notes: '' }

export default function PetHistorial({
  petId,
  vaccines,
  records,
  canEdit,
  onRefresh,
  hideTitle = false,
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('vaccine')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [uploadingId, setUploadingId] = useState(null)

  const isVaccine = tab === 'vaccine'
  const items = isVaccine
    ? [...vaccines].sort((a, b) => String(b.administered_at).localeCompare(String(a.administered_at)))
    : records
        .filter((r) => r.record_type === tab)
        .sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)))

  async function addItem(e) {
    e.preventDefault()
    if (isVaccine) {
      const res = await fetch(`${API_URL}/api/pets/${petId}/vaccines`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: form.title.trim(),
          administered_at: form.occurred_at,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) return alert(t('historial.saveError'))
    } else {
      const res = await fetch(`${API_URL}/api/pets/${petId}/records`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          record_type: tab,
          title: form.title.trim(),
          occurred_at: form.occurred_at,
          description: form.notes.trim() || null,
        }),
      })
      if (!res.ok) return alert(t('historial.saveError'))
      const created = await res.json()
      setForm(emptyForm)
      await onRefresh()
      return created
    }
    setForm(emptyForm)
    await onRefresh()
  }

  async function saveItem(id) {
    if (isVaccine) {
      const res = await fetch(`${API_URL}/api/pets/${petId}/vaccines/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          name: editForm.title.trim(),
          administered_at: editForm.occurred_at,
          notes: editForm.notes.trim() || null,
        }),
      })
      if (!res.ok) return alert(t('historial.saveError'))
    } else {
      const res = await fetch(`${API_URL}/api/pets/${petId}/records/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          title: editForm.title.trim(),
          occurred_at: editForm.occurred_at,
          description: editForm.notes.trim() || null,
        }),
      })
      if (!res.ok) return alert(t('historial.saveError'))
    }
    setEditingId(null)
    await onRefresh()
  }

  async function deleteItem(id) {
    if (!confirm(t('historial.deleteConfirm'))) return
    const url = isVaccine
      ? `${API_URL}/api/pets/${petId}/vaccines/${id}`
      : `${API_URL}/api/pets/${petId}/records/${id}`
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders() })
    if (!res.ok) return alert(t('historial.saveError'))
    await onRefresh()
  }

  async function uploadExam(recordId, file) {
    if (!file) return
    setUploadingId(recordId)
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${API_URL}/api/pets/${petId}/records/${recordId}/document`, {
      method: 'POST',
      headers: authHeaders(false),
      body,
    })
    setUploadingId(null)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(typeof err.detail === 'string' ? err.detail : t('historial.uploadError'))
      return
    }
    await onRefresh()
  }

  async function downloadExam(record) {
    const res = await fetch(`${API_URL}/api/pets/${petId}/records/${record.id}/document`, {
      headers: authHeaders(false),
    })
    if (!res.ok) return alert(t('historial.downloadError'))
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = record.document_filename || 'examen'
    a.click()
    URL.revokeObjectURL(url)
  }

  function startEdit(item) {
    setEditingId(item.id)
    if (isVaccine) {
      setEditForm({
        title: item.name,
        occurred_at: item.administered_at,
        notes: item.notes || '',
      })
    } else {
      setEditForm({
        title: item.title,
        occurred_at: item.occurred_at,
        notes: item.description || '',
      })
    }
  }

  return (
    <section id="historial" className="scroll-mt-24 space-y-4">
      {!hideTitle && (
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cyan-950 dark:text-cyan-50">
          <FileText size={18} /> {t('historial.title')}
        </h2>
      )}

      <div className="flex flex-wrap gap-1.5 border-b border-cyan-100 pb-2 dark:border-cyan-800">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => {
              setTab(tabItem.id)
              setEditingId(null)
              setForm(emptyForm)
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === tabItem.id
                ? 'bg-cyan-700 text-white dark:bg-cyan-500 dark:text-cyan-950'
                : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-900/50 dark:text-cyan-100'
            }`}
          >
            {tabItem.id === 'vaccine' && <Syringe size={11} className="mr-1 inline" />}
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      {canEdit && (
        <form onSubmit={addItem} className="grid gap-2 rounded-xl border border-cyan-100 bg-white p-4 dark:border-cyan-800 dark:bg-cyan-900/40 sm:grid-cols-4">
          <input
            className="field px-3 py-2 text-sm sm:col-span-2"
            placeholder={t('historial.titleField')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            type="date"
            className="field px-3 py-2 text-sm"
            value={form.occurred_at}
            onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary text-sm">
            <Plus size={14} /> {t('historial.add')}
          </button>
          <textarea
            className="field px-3 py-2 text-sm sm:col-span-4"
            rows={2}
            placeholder={t('historial.notes')}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </form>
      )}

      <ul className="space-y-2">
        {items.length === 0 && (
          <li className="text-sm text-cyan-600 dark:text-cyan-400">{t('historial.empty')}</li>
        )}
        {items.map((item) => {
          const title = isVaccine ? item.name : item.title
          const date = isVaccine ? item.administered_at : item.occurred_at
          const notes = isVaccine ? item.notes : item.description
          return (
            <li key={item.id} className="rounded-xl border border-cyan-100 bg-white px-4 py-3 text-sm dark:border-cyan-800 dark:bg-cyan-900/40">
              {editingId === item.id ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className="field px-2 py-1.5" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  <input type="date" className="field px-2 py-1.5" value={editForm.occurred_at} onChange={(e) => setEditForm({ ...editForm, occurred_at: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => saveItem(item.id)}>
                      <Check size={12} /> {t('common.save')}
                    </button>
                    <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditingId(null)}>
                      <X size={12} />
                    </button>
                  </div>
                  <textarea
                    className="field px-2 py-1.5 sm:col-span-3"
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder={t('historial.notes')}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <strong className="text-cyan-900 dark:text-cyan-100">{title}</strong>
                      <span className="text-cyan-600 dark:text-cyan-400"> · {date}</span>
                      {notes && <p className="mt-1 text-xs text-cyan-700 dark:text-cyan-300">{notes}</p>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800" onClick={() => startEdit(item)}>
                          <Pencil size={12} /> {t('common.edit')}
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700" onClick={() => deleteItem(item.id)}>
                          <Trash2 size={12} /> {t('common.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                  {tab === 'exam' && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-cyan-50 pt-2 dark:border-cyan-800/60">
                      {item.has_document ? (
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs text-teal-800 dark:bg-teal-900/40 dark:text-teal-100" onClick={() => downloadExam(item)}>
                          <Download size={12} /> {item.document_filename || t('historial.download')}
                        </button>
                      ) : (
                        <span className="text-xs text-cyan-500">{t('historial.noFile')}</span>
                      )}
                      {canEdit && (
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100">
                          <Paperclip size={12} />
                          {uploadingId === item.id ? t('historial.uploading') : t('historial.attach')}
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,application/pdf,image/*"
                            onChange={(e) => uploadExam(item.id, e.target.files?.[0])}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

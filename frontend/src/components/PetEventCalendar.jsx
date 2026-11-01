import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'

const TYPE_STYLES = {
  appointment: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  vaccine: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
  medicine: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

const TYPE_DOT = {
  appointment: 'bg-teal-500',
  vaccine: 'bg-cyan-500',
  medicine: 'bg-amber-500',
  other: 'bg-slate-400',
}

const emptyForm = {
  event_type: 'appointment',
  title: '',
  scheduled_at: '',
}

function parseApiDate(iso) {
  if (!iso) return null
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

function localDayKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function eventDayKey(iso) {
  const d = parseApiDate(iso)
  if (!d || Number.isNaN(d.getTime())) return null
  return localDayKey(d)
}

function buildMonthCells(year, month, weekStartsOn) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() - weekStartsOn + 7) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

function weekStartsOnForLocale(locale) {
  const code = String(locale || 'es').toLowerCase()
  return code.startsWith('en') ? 0 : 1
}

export default function PetEventCalendar({
  events,
  canEdit,
  locale,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const { t } = useTranslation()
  const today = new Date()
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [modalDay, setModalDay] = useState(null)
  const [mode, setMode] = useState('list') // list | create | edit
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)

  const weekStartsOn = weekStartsOnForLocale(locale)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    const base = new Date(2024, 0, 7 + weekStartsOn)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
      const label = fmt.format(d)
      return label.charAt(0).toUpperCase() + label.slice(1)
    })
  }, [locale, weekStartsOn])

  const cells = useMemo(() => buildMonthCells(year, month, weekStartsOn), [year, month, weekStartsOn])

  const byDay = useMemo(() => {
    const map = new Map()
    for (const ev of events || []) {
      const key = eventDayKey(ev.scheduled_at)
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(ev)
    }
    for (const list of map.values()) {
      list.sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))
    }
    return map
  }, [events])

  const dayEvents = modalDay ? byDay.get(modalDay) || [] : []
  const monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )
  const todayKey = localDayKey(today)
  const modalOpen = Boolean(modalDay)

  useEffect(() => {
    if (!modalOpen) return undefined
    function onKey(e) {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  function shiftMonth(delta) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  function goToday() {
    const now = new Date()
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  function openDay(date) {
    const key = localDayKey(date)
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
    }
    setModalDay(key)
    setMode('list')
    setEditingId(null)
    setForm({
      event_type: 'appointment',
      title: '',
      scheduled_at: `${key}T09:00`,
    })
  }

  function closeModal() {
    setModalDay(null)
    setMode('list')
    setEditingId(null)
    setForm(emptyForm)
  }

  function startCreate() {
    setMode('create')
    setEditingId(null)
    setForm({
      event_type: 'appointment',
      title: '',
      scheduled_at: `${modalDay}T09:00`,
    })
  }

  function startEdit(ev) {
    setMode('edit')
    setEditingId(ev.id)
    setForm({
      event_type: ev.event_type,
      title: ev.title || '',
      scheduled_at: toLocalInput(ev.scheduled_at),
      completed: ev.completed,
    })
  }

  async function submitForm(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.scheduled_at) return
    setBusy(true)
    try {
      if (mode === 'edit' && editingId != null) {
        await onUpdate(editingId, {
          event_type: form.event_type,
          title: form.title.trim(),
          scheduled_at: form.scheduled_at,
          completed: form.completed,
        })
      } else {
        await onCreate({
          event_type: form.event_type,
          title: form.title.trim(),
          scheduled_at: form.scheduled_at,
        })
      }
      setMode('list')
      setEditingId(null)
      setForm({
        event_type: 'appointment',
        title: '',
        scheduled_at: `${modalDay}T09:00`,
      })
    } finally {
      setBusy(false)
    }
  }

  const dayLabel = modalDay
    ? new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date(`${modalDay}T12:00:00`))
    : ''

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-sm dark:border-cyan-800 dark:bg-cyan-950/40">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-100/80 px-3 py-2 dark:border-cyan-800">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-cyan-800 transition hover:bg-cyan-50 dark:text-cyan-100 dark:hover:bg-cyan-900"
              onClick={() => shiftMonth(-1)}
              aria-label={t('pet.calendarPrev')}
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="min-w-[10rem] text-center font-display text-sm font-semibold capitalize text-cyan-950 dark:text-cyan-50">
              {monthTitle}
            </h3>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-cyan-800 transition hover:bg-cyan-50 dark:text-cyan-100 dark:hover:bg-cyan-900"
              onClick={() => shiftMonth(1)}
              aria-label={t('pet.calendarNext')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={goToday}>
            {t('pet.calendarToday')}
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-cyan-100/70 dark:border-cyan-800/80">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((date) => {
            const key = localDayKey(date)
            const inMonth = date.getMonth() === month
            const dayEv = byDay.get(key) || []
            const selected = key === modalDay
            const isToday = key === todayKey
            return (
              <button
                key={key}
                type="button"
                onClick={() => openDay(date)}
                className={[
                  'min-h-[2.6rem] border-b border-r border-cyan-50 p-0.5 text-left transition sm:min-h-[5.25rem] sm:p-1 dark:border-cyan-900/60',
                  inMonth ? 'bg-white dark:bg-transparent' : 'bg-cyan-50/40 dark:bg-cyan-950/20',
                  selected ? 'ring-2 ring-inset ring-teal-400 dark:ring-teal-500' : 'hover:bg-cyan-50/80 dark:hover:bg-cyan-900/30',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold sm:h-6 sm:w-6 sm:text-xs',
                    isToday
                      ? 'bg-teal-600 text-white'
                      : inMonth
                        ? 'text-cyan-900 dark:text-cyan-100'
                        : 'text-cyan-400 dark:text-cyan-600',
                  ].join(' ')}
                >
                  {date.getDate()}
                </span>
                {dayEv.length > 0 && (
                  <>
                    {/* Mobile: dots only */}
                    <div className="mt-0.5 flex flex-wrap items-center gap-0.5 px-0.5 sm:hidden">
                      {dayEv.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[ev.event_type] || TYPE_DOT.other}`}
                          title={ev.title}
                        />
                      ))}
                      {dayEv.length > 3 && (
                        <span className="text-[9px] leading-none text-cyan-500">+{dayEv.length - 3}</span>
                      )}
                    </div>
                    {/* Desktop: event titles */}
                    <div className="mt-1 hidden space-y-0.5 sm:block">
                      {dayEv.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className={[
                            'truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight lg:text-[11px]',
                            TYPE_STYLES[ev.event_type] || TYPE_STYLES.other,
                          ].join(' ')}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEv.length > 3 && (
                        <p className="px-0.5 text-[10px] text-cyan-500 dark:text-cyan-400">
                          +{dayEv.length - 3}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-cyan-950/40 p-3 sm:items-center"
          role="presentation"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-day-modal-title"
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-cyan-100 bg-white p-4 shadow-xl dark:border-cyan-800 dark:bg-cyan-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3
                  id="calendar-day-modal-title"
                  className="font-display text-base font-semibold capitalize text-cyan-950 dark:text-cyan-50"
                >
                  {dayLabel}
                </h3>
                <p className="text-xs text-cyan-600 dark:text-cyan-400">
                  {mode === 'create'
                    ? t('pet.calendarAddEvent')
                    : mode === 'edit'
                      ? t('pet.calendarEditEvent')
                      : t('pet.calendarDayDetail')}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-cyan-700 hover:bg-cyan-50 dark:text-cyan-200 dark:hover:bg-cyan-900"
                onClick={closeModal}
                aria-label={t('common.cancel')}
              >
                <X size={16} />
              </button>
            </div>

            {mode === 'list' ? (
              <div className="space-y-3">
                {dayEvents.length === 0 ? (
                  <p className="text-sm text-cyan-600 dark:text-cyan-400">{t('pet.noEventsThatDay')}</p>
                ) : (
                  <ul className="space-y-2">
                    {dayEvents.map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded-xl border border-cyan-100 bg-cyan-50/50 px-3 py-2.5 text-sm dark:border-cyan-800 dark:bg-cyan-900/40"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span
                              className={[
                                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                TYPE_STYLES[ev.event_type] || TYPE_STYLES.other,
                              ].join(' ')}
                            >
                              {t(`pet.${ev.event_type}`, { defaultValue: ev.event_type })}
                            </span>
                            <p className="mt-1 font-medium text-cyan-950 dark:text-cyan-50">{ev.title}</p>
                            <p className="text-xs text-cyan-600 dark:text-cyan-400">
                              {formatLocalDateTime(ev.scheduled_at, locale)}
                            </p>
                          </div>
                          {canEdit && (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs text-cyan-800 shadow-sm dark:bg-cyan-950"
                                onClick={() => startEdit(ev)}
                              >
                                <Pencil size={12} /> {t('pet.edit')}
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950/40"
                                onClick={() => onDelete(ev.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {canEdit && (
                  <button type="button" className="btn-primary w-full text-sm" onClick={startCreate}>
                    <Plus size={14} /> {t('pet.add')}
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={submitForm} className="space-y-2.5">
                <select
                  className="field w-full px-3 py-2 text-sm"
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                >
                  <option value="appointment">{t('pet.appointment')}</option>
                  <option value="vaccine">{t('pet.vaccine')}</option>
                  <option value="medicine">{t('pet.medicine')}</option>
                  <option value="other">{t('pet.other')}</option>
                </select>
                <input
                  className="field w-full px-3 py-2 text-sm"
                  placeholder={t('pet.title')}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  autoFocus
                />
                <input
                  type="datetime-local"
                  className="field w-full px-3 py-2 text-sm"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  required
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className="btn-secondary flex-1 text-sm"
                    onClick={() => {
                      setMode('list')
                      setEditingId(null)
                    }}
                    disabled={busy}
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn-primary flex-1 text-sm" disabled={busy}>
                    <Check size={14} /> {t('common.save')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

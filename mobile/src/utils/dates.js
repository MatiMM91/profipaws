export function parseApiDate(iso) {
  if (!iso) return null
  const s = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`
  return new Date(s)
}

export function formatDue(iso, locale) {
  if (!iso) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(locale)
  }
  const d = parseApiDate(iso)
  if (!d || Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString(locale)
}

export function formatDateTime(iso, locale) {
  const d = parseApiDate(iso)
  if (!d || Number.isNaN(d.getTime())) return String(iso || '')
  return d.toLocaleString(locale)
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

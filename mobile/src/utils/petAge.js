import i18n from '../i18n'

const AGE_LABELS = {
  es: {
    years: (n) => `${n} años`,
    months: (n) => `${n} meses`,
    weeks: (n) => `${n} semanas`,
  },
  en: {
    years: (n) => `${n} years`,
    months: (n) => `${n} months`,
    weeks: (n) => `${n} weeks`,
  },
  pt: {
    years: (n) => `${n} anos`,
    months: (n) => `${n} meses`,
    weeks: (n) => `${n} semanas`,
  },
}

function ageLabels() {
  const lang = String(i18n.language || 'es').slice(0, 2)
  return AGE_LABELS[lang] || AGE_LABELS.es
}

/**
 * Format a pet's age from birth_date (YYYY-MM-DD) for display.
 * Returns null when birth date is missing or invalid.
 */
export function formatPetAge(birthDate) {
  if (!birthDate) return null
  const birth = new Date(`${String(birthDate).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (birth > now) return null

  const msPerDay = 24 * 60 * 60 * 1000
  const days = Math.floor((now - birth) / msPerDay)
  const yearsExact = (now - birth) / (365.25 * msPerDay)
  const labels = ageLabels()

  if (days < 14) {
    const weeks = Math.max(1, Math.floor(days / 7))
    return labels.weeks(weeks)
  }
  if (yearsExact < 1) {
    const months = Math.max(1, Math.floor(yearsExact * 12))
    return labels.months(months)
  }

  const rounded = Math.round(yearsExact * 10) / 10
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return labels.years(value)
}

/** First profile line: Species - Breed - Color */
export function formatPetSummaryLine(pet, t) {
  const species = t(`dashboard.${pet.species}`, { defaultValue: pet.species })
  const breed = pet.breed?.trim() || t('pet.noBreed')
  const parts = [species, breed]
  if (pet.color?.trim()) parts.push(pet.color.trim())
  return parts.join(' - ')
}

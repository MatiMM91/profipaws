/**
 * Format a pet's age from birth_date (YYYY-MM-DD) for display.
 * Returns null when birth date is missing or invalid.
 */
export function formatPetAge(birthDate, t) {
  if (!birthDate) return null
  const birth = new Date(`${String(birthDate).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (birth > now) return null

  const msPerDay = 24 * 60 * 60 * 1000
  const days = Math.floor((now - birth) / msPerDay)
  const yearsExact = (now - birth) / (365.25 * msPerDay)

  if (days < 14) {
    const weeks = Math.max(1, Math.floor(days / 7))
    return t('pet.ageWeeks', { count: weeks })
  }
  if (yearsExact < 1) {
    const months = Math.max(1, Math.floor(yearsExact * 12))
    return t('pet.ageMonths', { count: months })
  }

  const rounded = Math.round(yearsExact * 10) / 10
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return t('pet.ageYears', { count: value })
}

/** First profile line: Species - Breed - Color */
export function formatPetSummaryLine(pet, t) {
  const species = t(`dashboard.${pet.species}`, { defaultValue: pet.species })
  const breed = pet.breed?.trim() || t('pet.noBreed')
  const parts = [species, breed]
  if (pet.color?.trim()) parts.push(pet.color.trim())
  return parts.join(' - ')
}

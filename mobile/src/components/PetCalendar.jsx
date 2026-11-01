import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native'
import { api } from '../api/client'
import { useTheme } from '../theme/ThemeContext'
import { Body, Field, PrimaryButton } from './ui'
import { formatDateTime, parseApiDate, todayISO } from '../utils/dates'

const EVENT_TYPES = ['appointment', 'vaccine', 'medicine', 'other']

const TYPE_COLORS = {
  appointment: { bg: '#ccfbf1', text: '#115e59' },
  vaccine: { bg: '#cffafe', text: '#155e75' },
  medicine: { bg: '#fef3c7', text: '#92400e' },
  other: { bg: '#e2e8f0', text: '#334155' },
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

function weekStartsOnForLocale(locale) {
  const code = String(locale || 'es').toLowerCase()
  return code.startsWith('en') ? 0 : 1
}

function buildMonthCells(year, month, weekStartsOn) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() - weekStartsOn + 7) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

export default function PetCalendar({ petId, canEdit }) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const today = new Date()
  const [events, setEvents] = useState([])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedKey, setSelectedKey] = useState(() => localDayKey(today))
  const [form, setForm] = useState({
    title: '',
    event_type: 'appointment',
    scheduled_at: `${todayISO()}T09:00`,
  })
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await api(`/api/pets/${petId}/events`)
    setEvents(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    load().catch(() => {})
  }, [petId])

  const weekStartsOn = weekStartsOnForLocale(i18n.language)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const cells = useMemo(() => buildMonthCells(year, month, weekStartsOn), [year, month, weekStartsOn])

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' })
    const base = new Date(2024, 0, 7 + weekStartsOn)
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)),
    )
  }, [i18n.language, weekStartsOn])

  const byDay = useMemo(() => {
    const map = new Map()
    for (const ev of events) {
      const key = eventDayKey(ev.scheduled_at)
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(ev)
    }
    return map
  }, [events])

  const selectedEvents = byDay.get(selectedKey) || []
  const monthTitle = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )
  const todayKey = localDayKey(today)

  async function add() {
    if (!form.title.trim() || !form.scheduled_at) return
    setSaving(true)
    try {
      await api(`/api/pets/${petId}/events`, {
        method: 'POST',
        body: {
          title: form.title.trim(),
          event_type: form.event_type,
          scheduled_at: new Date(form.scheduled_at).toISOString(),
        },
      })
      setForm({ title: '', event_type: 'appointment', scheduled_at: `${selectedKey}T09:00` })
      await load()
    } catch {
      Alert.alert(t('common.save'))
    } finally {
      setSaving(false)
    }
  }

  function remove(id) {
    Alert.alert(t('pet.deleteEvent'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await api(`/api/pets/${petId}/events/${id}`, { method: 'DELETE' })
          await load()
        },
      },
    ])
  }

  function selectDay(date) {
    const key = localDayKey(date)
    setSelectedKey(key)
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
    }
    if (canEdit) {
      setForm((f) => ({
        ...f,
        scheduled_at: f.scheduled_at?.startsWith(key) ? f.scheduled_at : `${key}T09:00`,
      }))
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.text }}>
        {t('pet.calendar')}
      </Text>
      <Body muted>{t('pet.calendarHint')}</Body>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: colors.surface,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 10,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.surfaceBorder,
          }}
        >
          <Pressable
            onPress={() => setCursor(new Date(year, month - 1, 1))}
            hitSlop={8}
            style={{ padding: 6 }}
          >
            <ChevronLeft size={18} color={colors.text} />
          </Pressable>
          <Text style={{ fontFamily: 'DMSans_600SemiBold', color: colors.text, textTransform: 'capitalize' }}>
            {monthTitle}
          </Text>
          <Pressable
            onPress={() => setCursor(new Date(year, month + 1, 1))}
            hitSlop={8}
            style={{ padding: 6 }}
          >
            <ChevronRight size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
          {weekdayLabels.map((label, idx) => (
            <Text
              key={`${label}-${idx}`}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 11,
                color: colors.muted,
                fontFamily: 'SourceSans3_600SemiBold',
              }}
            >
              {label}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((date) => {
            const key = localDayKey(date)
            const inMonth = date.getMonth() === month
            const count = (byDay.get(key) || []).length
            const selected = key === selectedKey
            const isToday = key === todayKey
            return (
              <Pressable
                key={key}
                onPress={() => selectDay(date)}
                style={{
                  width: '14.285%',
                  minHeight: 48,
                  paddingVertical: 6,
                  alignItems: 'center',
                  backgroundColor: selected ? colors.iconBg : 'transparent',
                  borderRadius: selected ? 10 : 0,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? colors.primary : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'SourceSans3_600SemiBold',
                      fontSize: 13,
                      color: isToday ? colors.primaryText : inMonth ? colors.text : colors.muted,
                    }}
                  >
                    {date.getDate()}
                  </Text>
                </View>
                {count > 0 && (
                  <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                      <View
                        key={i}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: colors.primary,
                        }}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      </View>

      {canEdit && (
        <View style={{ gap: 8 }}>
          <Field
            placeholder={t('pet.title')}
            value={form.title}
            onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {EVENT_TYPES.map((type) => {
              const active = form.event_type === type
              return (
                <Pressable
                  key={type}
                  onPress={() => setForm((f) => ({ ...f, event_type: type }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? colors.primary : colors.iconBg,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'SourceSans3_600SemiBold',
                      fontSize: 13,
                      color: active ? colors.primaryText : colors.icon,
                    }}
                  >
                    {t(`pet.${type}`)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Field
            placeholder="YYYY-MM-DDTHH:MM"
            value={form.scheduled_at}
            onChangeText={(v) => setForm((f) => ({ ...f, scheduled_at: v }))}
          />
          <PrimaryButton title={t('pet.add')} onPress={add} loading={saving} />
        </View>
      )}

      <Text style={{ fontFamily: 'DMSans_600SemiBold', color: colors.text, textTransform: 'capitalize' }}>
        {new Intl.DateTimeFormat(i18n.language, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }).format(new Date(`${selectedKey}T12:00:00`))}
      </Text>

      {selectedEvents.length === 0 ? (
        <Body muted>{t('pet.noEventsThatDay')}</Body>
      ) : (
        selectedEvents.map((ev) => {
          const tone = TYPE_COLORS[ev.event_type] || TYPE_COLORS.other
          return (
            <View
              key={ev.id}
              style={{
                borderWidth: 1,
                borderColor: colors.surfaceBorder,
                borderRadius: 14,
                padding: 12,
                backgroundColor: colors.surface,
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: tone.bg,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ fontSize: 11, fontFamily: 'SourceSans3_600SemiBold', color: tone.text }}>
                    {t(`pet.${ev.event_type}`, { defaultValue: ev.event_type })}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'DMSans_600SemiBold', color: colors.text }}>{ev.title}</Text>
                <Body muted style={{ fontSize: 13 }}>
                  {formatDateTime(ev.scheduled_at, i18n.language)}
                </Body>
              </View>
              {canEdit && (
                <Pressable onPress={() => remove(ev.id)} hitSlop={8}>
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              )}
            </View>
          )
        })
      )}
    </View>
  )
}

import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react-native'
import { api } from '../api/client'
import { useTheme } from '../theme/ThemeContext'
import { Body, Field, PrimaryButton } from './ui'
import { formatDue, todayISO } from '../utils/dates'

const EVENT_TYPES = ['appointment', 'vaccine', 'medicine', 'other']

export default function PetCalendar({ petId, canEdit }) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const [events, setEvents] = useState([])
  const [form, setForm] = useState({
    title: '',
    event_type: 'appointment',
    due_at: todayISO(),
  })
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await api(`/api/pets/${petId}/events`)
    setEvents(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    load().catch(() => {})
  }, [petId])

  async function add() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await api(`/api/pets/${petId}/events`, {
        method: 'POST',
        body: {
          title: form.title.trim(),
          event_type: form.event_type,
          due_at: form.due_at,
        },
      })
      setForm({ title: '', event_type: 'appointment', due_at: todayISO() })
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

  return (
    <View style={{ gap: 14 }}>
      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.text }}>
        {t('pet.calendar')}
      </Text>
      <Body muted>{t('pet.calendarHint')}</Body>

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
            placeholder="YYYY-MM-DD"
            value={form.due_at}
            onChangeText={(v) => setForm((f) => ({ ...f, due_at: v }))}
          />
          <PrimaryButton title={t('pet.add')} onPress={add} loading={saving} />
        </View>
      )}

      {events.length === 0 ? (
        <Body muted>{t('pet.noEvents')}</Body>
      ) : (
        events.map((ev) => (
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
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', color: colors.text }}>
                {ev.title}
              </Text>
              <Body muted style={{ fontSize: 13 }}>
                {t(`pet.${ev.event_type}`, { defaultValue: ev.event_type })} ·{' '}
                {formatDue(ev.due_at, i18n.language)}
              </Body>
            </View>
            {canEdit && (
              <Pressable onPress={() => remove(ev.id)} hitSlop={8}>
                <Trash2 size={16} color={colors.danger} />
              </Pressable>
            )}
          </View>
        ))
      )}
    </View>
  )
}

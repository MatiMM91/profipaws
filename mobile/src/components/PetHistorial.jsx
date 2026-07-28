import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react-native'
import { api } from '../api/client'
import { useTheme } from '../theme/ThemeContext'
import { Body, Field, PrimaryButton } from './ui'
import { formatDue, todayISO } from '../utils/dates'

const RECORD_TABS = [
  { key: 'vaccines', labelKey: 'historial.tabVaccines' },
  { key: 'disease', labelKey: 'historial.tabDiseases' },
  { key: 'surgery', labelKey: 'historial.tabSurgeries' },
  { key: 'exam', labelKey: 'historial.tabExams' },
  { key: 'treatment', labelKey: 'historial.tabTreatments' },
]

export default function PetHistorial({ petId, canEdit }) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const [tab, setTab] = useState('vaccines')
  const [vaccines, setVaccines] = useState([])
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({ name: '', title: '', notes: '', administered_at: todayISO(), next_due_at: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [v, r] = await Promise.all([
      api(`/api/pets/${petId}/vaccines`),
      api(`/api/pets/${petId}/records`),
    ])
    setVaccines(Array.isArray(v) ? v : [])
    setRecords(Array.isArray(r) ? r : [])
  }

  useEffect(() => {
    load().catch(() => {})
  }, [petId])

  const list =
    tab === 'vaccines'
      ? vaccines
      : records.filter((r) => r.record_type === tab || r.type === tab)

  async function add() {
    setSaving(true)
    try {
      if (tab === 'vaccines') {
        await api(`/api/pets/${petId}/vaccines`, {
          method: 'POST',
          body: {
            name: form.name,
            administered_at: form.administered_at || null,
            next_due_at: form.next_due_at || null,
            notes: form.notes || null,
          },
        })
      } else {
        await api(`/api/pets/${petId}/records`, {
          method: 'POST',
          body: {
            title: form.title || form.name,
            record_type: tab,
            notes: form.notes || null,
            occurred_at: form.administered_at || null,
          },
        })
      }
      setForm({ name: '', title: '', notes: '', administered_at: todayISO(), next_due_at: '' })
      await load()
    } catch {
      Alert.alert(t('historial.saveError'))
    } finally {
      setSaving(false)
    }
  }

  function remove(item) {
    Alert.alert(t('historial.deleteConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (tab === 'vaccines') {
            await api(`/api/pets/${petId}/vaccines/${item.id}`, { method: 'DELETE' })
          } else {
            await api(`/api/pets/${petId}/records/${item.id}`, { method: 'DELETE' })
          }
          await load()
        },
      },
    ])
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {RECORD_TABS.map((item) => {
          const active = tab === item.key
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
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
                {t(item.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {canEdit && (
        <View style={{ gap: 8 }}>
          <Field
            placeholder={tab === 'vaccines' ? t('historial.vaccineName') : t('historial.titleField')}
            value={tab === 'vaccines' ? form.name : form.title}
            onChangeText={(v) =>
              setForm((f) => (tab === 'vaccines' ? { ...f, name: v } : { ...f, title: v }))
            }
          />
          <Field
            placeholder={t('historial.administeredAt')}
            value={form.administered_at}
            onChangeText={(v) => setForm((f) => ({ ...f, administered_at: v }))}
          />
          {tab === 'vaccines' && (
            <Field
              placeholder={t('historial.nextDueAt')}
              value={form.next_due_at}
              onChangeText={(v) => setForm((f) => ({ ...f, next_due_at: v }))}
            />
          )}
          <Field
            placeholder={t('historial.notes')}
            value={form.notes}
            onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
          />
          <PrimaryButton title={t('historial.add')} onPress={add} loading={saving} />
        </View>
      )}

      {list.length === 0 ? (
        <Body muted>{t('historial.empty')}</Body>
      ) : (
        list.map((item) => (
          <View
            key={item.id}
            style={{
              borderWidth: 1,
              borderColor: colors.surfaceBorder,
              borderRadius: 14,
              padding: 12,
              backgroundColor: colors.surface,
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: 'DMSans_600SemiBold', color: colors.text, fontSize: 16 }}>
                {item.name || item.title}
              </Text>
              {canEdit && (
                <Pressable onPress={() => remove(item)} hitSlop={8}>
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              )}
            </View>
            {(item.administered_at || item.occurred_at) && (
              <Body muted style={{ fontSize: 13 }}>
                {formatDue(item.administered_at || item.occurred_at, i18n.language)}
              </Body>
            )}
            {item.next_due_at && (
              <Body muted style={{ fontSize: 13 }}>
                {t('pet.next')}: {formatDue(item.next_due_at, i18n.language)}
              </Body>
            )}
            {item.notes ? <Body style={{ fontSize: 13 }}>{item.notes}</Body> : null}
          </View>
        ))
      )}
    </View>
  )
}

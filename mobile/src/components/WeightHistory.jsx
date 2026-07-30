import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react-native'
import { api } from '../api/client'
import { useTheme } from '../theme/ThemeContext'
import { Field, PrimaryButton, Body } from './ui'
import { formatDue } from '../utils/dates'

export default function WeightHistory({ petId, canEdit, onPetWeightChange, embedded = false }) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const [items, setItems] = useState([])
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  function latestKg(list) {
    if (!list.length) return null
    const latest = list.reduce((a, b) =>
      a.recorded_at > b.recorded_at || (a.recorded_at === b.recorded_at && a.id > b.id) ? a : b
    )
    return latest.weight_kg
  }

  async function load() {
    try {
      const data = await api(`/api/pets/${petId}/weights`)
      const list = Array.isArray(data) ? data : data?.items || []
      setItems(list)
      onPetWeightChange?.(latestKg(list))
    } catch {
      setItems([])
      onPetWeightChange?.(null)
    }
  }

  useEffect(() => {
    load()
  }, [petId])

  async function add() {
    const kg = Number(String(value).replace(',', '.'))
    if (!kg || Number.isNaN(kg)) return
    setSaving(true)
    try {
      await api(`/api/pets/${petId}/weights`, {
        method: 'POST',
        body: { weight_kg: kg },
      })
      setValue('')
      await load()
    } catch {
      Alert.alert(t('pet.weightSaveError'))
    } finally {
      setSaving(false)
    }
  }

  function remove(id) {
    Alert.alert(t('pet.deleteWeight'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await api(`/api/pets/${petId}/weights/${id}`, { method: 'DELETE' })
          await load()
        },
      },
    ])
  }

  return (
    <View style={{ gap: 12 }}>
      {!embedded && (
        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 17, color: colors.text }}>
          {t('pet.weightHistory')}
        </Text>
      )}
      {canEdit && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field
            style={{ flex: 1 }}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder={t('pet.weight')}
          />
          <PrimaryButton
            title={t('pet.weightAdd')}
            onPress={add}
            loading={saving}
            icon={<Plus size={16} color={colors.primaryText} />}
            style={{ paddingHorizontal: 14 }}
          />
        </View>
      )}
      {items.length === 0 ? (
        <Body muted>{t('pet.weightEmpty')}</Body>
      ) : (
        items.slice(0, 12).map((w) => (
          <View
            key={w.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.surfaceBorder,
            }}
          >
            <View>
              <Body>{w.weight_kg} kg</Body>
              <Body muted style={{ fontSize: 12 }}>
                {formatDue(w.recorded_at || w.created_at, i18n.language)}
              </Body>
            </View>
            {canEdit && (
              <Pressable onPress={() => remove(w.id)} hitSlop={8}>
                <Trash2 size={16} color={colors.danger} />
              </Pressable>
            )}
          </View>
        ))
      )}
    </View>
  )
}

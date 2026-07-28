import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { QrCode } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, ApiError } from '../../../src/api/client'
import { useAuth } from '../../../src/auth/AuthContext'
import PetCalendar from '../../../src/components/PetCalendar'
import PetConsultations from '../../../src/components/PetConsultations'
import PetHistorial from '../../../src/components/PetHistorial'
import PetTools from '../../../src/components/PetTools'
import SpeciesIcon from '../../../src/components/SpeciesIcon'
import WeightHistory from '../../../src/components/WeightHistory'
import {
  Body,
  Field,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Surface,
} from '../../../src/components/ui'
import { SPECIES_OPTIONS } from '../../../src/constants'
import { useTheme } from '../../../src/theme/ThemeContext'

const TABS = [
  { id: 'perfil', labelKey: 'pet.tabProfile' },
  { id: 'historial', labelKey: 'pet.tabHistorial' },
  { id: 'seguimiento', labelKey: 'pet.tabSeguimiento' },
  { id: 'calendario', labelKey: 'pet.tabCalendar' },
  { id: 'herramientas', labelKey: 'pet.tabTools' },
]

export default function PetProfileScreen() {
  const { id, tab: tabParam } = useLocalSearchParams()
  const petId = Array.isArray(id) ? id[0] : id
  const initialTab = Array.isArray(tabParam) ? tabParam[0] : tabParam

  const { t } = useTranslation()
  const router = useRouter()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const { logout } = useAuth()

  const [pet, setPet] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [conditions, setConditions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState(initialTab && TABS.some((x) => x.id === initialTab) ? initialTab : 'perfil')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [allergy, setAllergy] = useState('')
  const [chronic, setChronic] = useState({ name: '', notes: '' })
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'PRO'
  const isOwner = pet?.my_role === 'owner'
  const canEdit = pet?.my_role === 'owner' || pet?.my_role === 'edit'

  useLayoutEffect(() => {
    navigation.setOptions({
      title: pet?.name || t('dashboard.profile'),
      headerRight: () =>
        isOwner ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/pets/[id]/vet-access', params: { id: String(petId) } })
            }
            hitSlop={8}
            style={{ marginRight: 4 }}
          >
            <QrCode size={22} color={colors.icon} />
          </Pressable>
        ) : null,
    })
  }, [navigation, pet?.name, isOwner, petId, colors.icon, router, t])

  const load = useCallback(async () => {
    try {
      const [petData, subData, condData] = await Promise.all([
        api(`/api/pets/${petId}`),
        api('/api/subscriptions/me'),
        api(`/api/pets/${petId}/conditions`),
      ])
      setPet(petData)
      setSubscription(subData)
      setConditions(Array.isArray(condData) ? condData : [])
      setForm({
        name: petData.name || '',
        species: petData.species || 'dog',
        breed: petData.breed || '',
        chip_id: petData.chip_id || '',
        birth_date: petData.birth_date || '',
        weight_kg: petData.weight_kg != null ? String(petData.weight_kg) : '',
        allergies: Array.isArray(petData.allergies) ? petData.allergies : [],
      })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await logout()
        router.replace('/')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [petId, logout, router])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const allergies = useMemo(() => form.allergies || [], [form.allergies])

  async function savePet() {
    setSaving(true)
    try {
      const updated = await api(`/api/pets/${petId}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          species: form.species,
          breed: form.breed || null,
          chip_id: form.chip_id || null,
          birth_date: form.birth_date || null,
          weight_kg: form.weight_kg ? Number(String(form.weight_kg).replace(',', '.')) : null,
          allergies: form.allergies || [],
        },
      })
      setPet(updated)
      setEditing(false)
    } catch (e) {
      Alert.alert(e.message || t('common.save'))
    } finally {
      setSaving(false)
    }
  }

  async function addAllergy() {
    if (!allergy.trim()) return
    const next = [...allergies, allergy.trim()]
    setForm((f) => ({ ...f, allergies: next }))
    setAllergy('')
    try {
      await api(`/api/pets/${petId}`, { method: 'PATCH', body: { allergies: next } })
    } catch {
      Alert.alert(t('pet.allergySaveError'))
    }
  }

  function removeAllergy(name) {
    Alert.alert(t('pet.deleteAllergy'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const next = allergies.filter((a) => a !== name)
          setForm((f) => ({ ...f, allergies: next }))
          await api(`/api/pets/${petId}`, { method: 'PATCH', body: { allergies: next } })
        },
      },
    ])
  }

  async function addCondition() {
    if (!chronic.name.trim()) return
    try {
      await api(`/api/pets/${petId}/conditions`, {
        method: 'POST',
        body: { name: chronic.name.trim(), notes: chronic.notes || null },
      })
      setChronic({ name: '', notes: '' })
      const data = await api(`/api/pets/${petId}/conditions`)
      setConditions(Array.isArray(data) ? data : [])
    } catch {
      Alert.alert(t('pet.allergySaveError'))
    }
  }

  function removeCondition(conditionId) {
    Alert.alert(t('pet.deleteChronic'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await api(`/api/pets/${petId}/conditions/${conditionId}`, { method: 'DELETE' })
          setConditions((prev) => prev.filter((c) => c.id !== conditionId))
        },
      },
    ])
  }

  async function confirmDeletePet() {
    if (deleteConfirm !== pet.name) return
    try {
      await api(`/api/pets/${petId}`, { method: 'DELETE' })
      router.replace('/dashboard')
    } catch (e) {
      Alert.alert(e.message || t('pet.deletePetError'))
    }
  }

  if (loading || !pet) {
    return (
      <Screen>
        <LoadingState label={t('pet.loading')} />
      </Screen>
    )
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              load()
            }}
            tintColor={colors.primary}
          />
        }
      >
        <Surface style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: colors.iconBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SpeciesIcon species={pet.species} size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: colors.text }}>
              {pet.name}
            </Text>
            <Body muted>
              {t(`dashboard.${pet.species}`, { defaultValue: pet.species })}
              {pet.breed ? ` · ${pet.breed}` : ''}
            </Body>
            <Body muted style={{ fontSize: 13 }}>
              {pet.chip_id ? `${t('pet.chip')}: ${pet.chip_id}` : t('pet.noChip')}
            </Body>
          </View>
        </Surface>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TABS.map((item) => {
            const active = tab === item.id
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: active ? colors.primary : colors.iconBg,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'SourceSans3_600SemiBold',
                    color: active ? colors.primaryText : colors.icon,
                    fontSize: 13,
                  }}
                >
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {tab === 'perfil' && (
          <View style={{ gap: 16 }}>
            {canEdit && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {!editing ? (
                  <SecondaryButton title={t('pet.editData')} onPress={() => setEditing(true)} />
                ) : (
                  <>
                    <SecondaryButton
                      title={t('pet.cancel')}
                      onPress={() => {
                        setEditing(false)
                        load()
                      }}
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      title={saving ? t('pet.saving') : t('pet.saveChanges')}
                      onPress={savePet}
                      loading={saving}
                      style={{ flex: 1 }}
                    />
                  </>
                )}
              </View>
            )}

            {editing ? (
              <Surface style={{ gap: 10 }}>
                <Field
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder={t('dashboard.name')}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {SPECIES_OPTIONS.map((key) => {
                    const active = form.species === key
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setForm((f) => ({ ...f, species: key }))}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: active ? colors.primary : colors.iconBg,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'SourceSans3_600SemiBold',
                            fontSize: 12,
                            color: active ? colors.primaryText : colors.icon,
                          }}
                        >
                          {t(`dashboard.${key}`)}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                <Field
                  value={form.breed}
                  onChangeText={(v) => setForm((f) => ({ ...f, breed: v }))}
                  placeholder={t('pet.breed')}
                />
                <Field
                  value={form.chip_id}
                  onChangeText={(v) => setForm((f) => ({ ...f, chip_id: v }))}
                  placeholder={t('pet.chipPlaceholder')}
                />
                <Field
                  value={form.birth_date}
                  onChangeText={(v) => setForm((f) => ({ ...f, birth_date: v }))}
                  placeholder={`${t('pet.born')} (YYYY-MM-DD)`}
                />
                <Field
                  value={form.weight_kg}
                  onChangeText={(v) => setForm((f) => ({ ...f, weight_kg: v }))}
                  placeholder={t('pet.weight')}
                  keyboardType="decimal-pad"
                />
              </Surface>
            ) : null}

            <Surface style={{ gap: 10 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: colors.text }}>
                {t('pet.allergies')}
              </Text>
              {allergies.length === 0 ? (
                <Body muted>{t('pet.allergyEmpty')}</Body>
              ) : (
                allergies.map((a) => (
                  <View
                    key={a}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Body>{a}</Body>
                    {canEdit && (
                      <Pressable onPress={() => removeAllergy(a)}>
                        <Text style={{ color: colors.danger, fontFamily: 'SourceSans3_600SemiBold' }}>
                          {t('common.delete')}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ))
              )}
              {canEdit && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Field
                    style={{ flex: 1 }}
                    value={allergy}
                    onChangeText={setAllergy}
                    placeholder={t('pet.allergyPlaceholder')}
                  />
                  <PrimaryButton title={t('pet.allergyAdd')} onPress={addAllergy} />
                </View>
              )}
            </Surface>

            <Surface style={{ gap: 10 }}>
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: colors.text }}>
                {t('pet.chronic')}
              </Text>
              {conditions.length === 0 ? (
                <Body muted>{t('pet.chronicEmpty')}</Body>
              ) : (
                conditions.map((c) => (
                  <View key={c.id} style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Body>{c.name}</Body>
                      {canEdit && (
                        <Pressable onPress={() => removeCondition(c.id)}>
                          <Text style={{ color: colors.danger, fontFamily: 'SourceSans3_600SemiBold' }}>
                            {t('common.delete')}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    {c.notes ? <Body muted style={{ fontSize: 13 }}>{c.notes}</Body> : null}
                  </View>
                ))
              )}
              {canEdit && (
                <View style={{ gap: 8 }}>
                  <Field
                    value={chronic.name}
                    onChangeText={(v) => setChronic((c) => ({ ...c, name: v }))}
                    placeholder={t('pet.chronicPlaceholder')}
                  />
                  <Field
                    value={chronic.notes}
                    onChangeText={(v) => setChronic((c) => ({ ...c, notes: v }))}
                    placeholder={t('pet.chronicNotes')}
                  />
                  <PrimaryButton title={t('pet.chronicAdd')} onPress={addCondition} />
                </View>
              )}
            </Surface>

            <Surface>
              <WeightHistory petId={petId} canEdit={canEdit} />
            </Surface>

            {isOwner && (
              <Surface style={{ gap: 10, backgroundColor: colors.dangerBg }}>
                <Text style={{ fontFamily: 'DMSans_700Bold', color: colors.danger }}>
                  {t('pet.deletePetZone')}
                </Text>
                <Body muted>{t('pet.deletePetWarning')}</Body>
                {!showDelete ? (
                  <PrimaryButton
                    title={t('pet.deletePet')}
                    onPress={() => setShowDelete(true)}
                    style={{ backgroundColor: colors.danger }}
                  />
                ) : (
                  <View style={{ gap: 8 }}>
                    <Body>{t('pet.deletePetConfirm', { name: pet.name })}</Body>
                    <Field
                      value={deleteConfirm}
                      onChangeText={setDeleteConfirm}
                      placeholder={pet.name}
                      autoCapitalize="none"
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <SecondaryButton
                        title={t('common.cancel')}
                        onPress={() => {
                          setShowDelete(false)
                          setDeleteConfirm('')
                        }}
                        style={{ flex: 1 }}
                      />
                      <PrimaryButton
                        title={t('pet.deletePetConfirmAction')}
                        onPress={confirmDeletePet}
                        disabled={deleteConfirm !== pet.name}
                        style={{ flex: 1, backgroundColor: colors.danger }}
                      />
                    </View>
                  </View>
                )}
              </Surface>
            )}
          </View>
        )}

        {tab === 'historial' && <PetHistorial petId={petId} canEdit={canEdit} />}
        {tab === 'seguimiento' && <PetConsultations petId={petId} canEdit={canEdit} />}
        {tab === 'calendario' && <PetCalendar petId={petId} canEdit={canEdit} />}
        {tab === 'herramientas' && (
          <PetTools petId={petId} isPro={isPro} canEdit={canEdit} isOwner={isOwner} />
        )}
      </ScrollView>
    </Screen>
  )
}

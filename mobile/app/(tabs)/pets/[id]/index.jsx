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
import {
  Activity,
  AlertTriangle,
  Check,
  Pencil,
  Plus,
  QrCode,
  Share2,
  Trash2,
  Wrench,
  X,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, ApiError } from '../../../../src/api/client'
import { useAuth } from '../../../../src/auth/AuthContext'
import PetCalendar from '../../../../src/components/PetCalendar'
import PetConsultations from '../../../../src/components/PetConsultations'
import PetHistorial from '../../../../src/components/PetHistorial'
import SpeciesIcon from '../../../../src/components/SpeciesIcon'
import {
  Body,
  Field,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Surface,
} from '../../../../src/components/ui'
import { SPECIES_OPTIONS } from '../../../../src/constants'
import { amber, rose } from '../../../../src/theme/colors'
import { useTheme } from '../../../../src/theme/ThemeContext'

const TABS = [
  { id: 'perfil', labelKey: 'pet.tabProfile' },
  { id: 'historial', labelKey: 'pet.tabHistorial' },
  { id: 'seguimiento', labelKey: 'pet.tabSeguimiento' },
  { id: 'calendario', labelKey: 'pet.tabCalendar' },
]

export default function PetProfileScreen() {
  const { id, tab: tabParam } = useLocalSearchParams()
  const petId = Array.isArray(id) ? id[0] : id
  const initialTab = Array.isArray(tabParam) ? tabParam[0] : tabParam

  const { t } = useTranslation()
  const router = useRouter()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { logout } = useAuth()

  const [pet, setPet] = useState(null)
  const [conditions, setConditions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState(initialTab && TABS.some((x) => x.id === initialTab) ? initialTab : 'perfil')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [allergy, setAllergy] = useState('')
  const [showAllergyForm, setShowAllergyForm] = useState(false)
  const [editingAllergyIdx, setEditingAllergyIdx] = useState(null)
  const [allergyEdit, setAllergyEdit] = useState('')
  const [chronic, setChronic] = useState({ name: '', notes: '' })
  const [showConditionForm, setShowConditionForm] = useState(false)
  const [editingConditionId, setEditingConditionId] = useState(null)
  const [conditionEdit, setConditionEdit] = useState({ name: '', notes: '' })
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  const isOwner = pet?.my_role === 'owner'
  const canEdit = pet?.my_role === 'owner' || pet?.my_role === 'edit'

  useLayoutEffect(() => {
    navigation.setOptions({
      title: pet?.name || t('dashboard.profile'),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginRight: 4 }}>
          {isOwner ? (
            <>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/pets/[id]/share', params: { id: String(petId) } })
                }
                hitSlop={8}
                accessibilityLabel={t('share.title')}
              >
                <Share2 size={22} color={colors.icon} />
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/pets/[id]/vet-access', params: { id: String(petId) } })
                }
                hitSlop={8}
                accessibilityLabel={t('vet.title')}
              >
                <QrCode size={22} color={colors.icon} />
              </Pressable>
            </>
          ) : null}
          <Pressable
            onPress={() =>
              router.push({ pathname: '/pets/[id]/tools', params: { id: String(petId) } })
            }
            hitSlop={8}
            accessibilityLabel={t('pet.tools')}
          >
            <Wrench size={22} color={colors.icon} />
          </Pressable>
        </View>
      ),
    })
  }, [navigation, pet?.name, isOwner, petId, colors.icon, router, t])

  const load = useCallback(async () => {
    try {
      const [petData, condData] = await Promise.all([
        api(`/api/pets/${petId}`),
        api(`/api/pets/${petId}/conditions`),
      ])
      setPet(petData)
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
    setShowAllergyForm(false)
    try {
      await api(`/api/pets/${petId}`, { method: 'PATCH', body: { allergies: next } })
    } catch {
      Alert.alert(t('pet.allergySaveError'))
      load()
    }
  }

  async function saveAllergy(idx) {
    const name = allergyEdit.trim()
    if (!name) return
    const next = [...allergies]
    next[idx] = name
    setForm((f) => ({ ...f, allergies: next }))
    setEditingAllergyIdx(null)
    try {
      await api(`/api/pets/${petId}`, { method: 'PATCH', body: { allergies: next } })
    } catch {
      Alert.alert(t('pet.allergySaveError'))
      load()
    }
  }

  function removeAllergy(idx) {
    Alert.alert(t('pet.deleteAllergy'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const next = allergies.filter((_, i) => i !== idx)
          setForm((f) => ({ ...f, allergies: next }))
          try {
            await api(`/api/pets/${petId}`, { method: 'PATCH', body: { allergies: next } })
          } catch {
            Alert.alert(t('pet.allergySaveError'))
            load()
          }
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
      setShowConditionForm(false)
      const data = await api(`/api/pets/${petId}/conditions`)
      setConditions(Array.isArray(data) ? data : [])
    } catch {
      Alert.alert(t('pet.allergySaveError'))
    }
  }

  async function saveCondition(conditionId) {
    if (!conditionEdit.name.trim()) return
    try {
      await api(`/api/pets/${petId}/conditions/${conditionId}`, {
        method: 'PATCH',
        body: {
          name: conditionEdit.name.trim(),
          notes: (conditionEdit.notes || '').trim() || null,
        },
      })
      setEditingConditionId(null)
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
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: colors.text }}>
              {pet.name}
            </Text>
            <Body muted>
              {t(`dashboard.${pet.species}`, { defaultValue: pet.species })}
              {pet.breed ? ` · ${pet.breed}` : ''}
              {pet.color ? ` · ${pet.color}` : ''}
            </Body>
            <Body muted style={{ fontSize: 13 }}>
              {pet.chip_id ? `${t('pet.chip')}: ${pet.chip_id}` : t('pet.noChip')}
            </Body>
          </View>
          {canEdit && !editing ? (
            <Pressable
              onPress={() => {
                setTab('perfil')
                setEditing(true)
              }}
              hitSlop={8}
              accessibilityLabel={t('pet.editData')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.secondaryBorder,
                backgroundColor: colors.secondaryBg,
              }}
            >
              <Pencil size={14} color={colors.secondaryText} />
              <Text
                style={{
                  fontFamily: 'SourceSans3_600SemiBold',
                  fontSize: 12,
                  color: colors.secondaryText,
                }}
              >
                {t('pet.editData')}
              </Text>
            </Pressable>
          ) : null}
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
            {editing ? (
              <>
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
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
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
                </View>
              </Surface>
              </>
            ) : null}

            <Surface style={{ gap: 0, paddingVertical: 4 }}>
            <View
              style={{
                paddingTop: 12,
                paddingBottom: 4,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                  <AlertTriangle size={13} color={isDark ? amber[300] : amber[700]} />
                  <Text
                    style={{
                      fontFamily: 'SourceSans3_600SemiBold',
                      fontSize: 12,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      color: isDark ? 'rgba(252,211,77,0.9)' : 'rgba(180,83,9,0.9)',
                    }}
                  >
                    {t('pet.allergies')}
                  </Text>
                </View>
                {canEdit && !showAllergyForm && editingAllergyIdx == null ? (
                  <Pressable
                    onPress={() => setShowAllergyForm(true)}
                    hitSlop={8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}
                  >
                    <Plus size={12} color={isDark ? amber[300] : amber[800]} />
                    <Text
                      style={{
                        fontFamily: 'SourceSans3_600SemiBold',
                        fontSize: 12,
                        color: isDark ? amber[300] : amber[800],
                      }}
                    >
                      {t('pet.allergyAdd')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {showAllergyForm && canEdit ? (
                <View style={{ gap: 8 }}>
                  <Field
                    value={allergy}
                    onChangeText={setAllergy}
                    placeholder={t('pet.allergyPlaceholder')}
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <PrimaryButton title={t('pet.allergyAdd')} onPress={addAllergy} style={{ flex: 1 }} />
                    <Pressable
                      onPress={() => {
                        setShowAllergyForm(false)
                        setAllergy('')
                      }}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.secondaryBorder,
                        backgroundColor: colors.secondaryBg,
                        padding: 12,
                      }}
                    >
                      <X size={16} color={colors.secondaryText} />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {allergies.length === 0 && !showAllergyForm ? (
                <Body muted style={{ fontSize: 12 }}>{t('pet.allergyEmpty')}</Body>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {allergies.map((name, idx) =>
                    editingAllergyIdx === idx ? (
                      <View
                        key={`allergy-edit-${idx}`}
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 6,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isDark ? amber[900] : amber[200],
                          backgroundColor: isDark ? 'rgba(69,26,3,0.4)' : 'rgba(255,251,235,0.8)',
                          padding: 8,
                          maxWidth: '100%',
                        }}
                      >
                        <Field
                          style={{ minWidth: 120, flexGrow: 1, paddingVertical: 6, fontSize: 13 }}
                          value={allergyEdit}
                          onChangeText={setAllergyEdit}
                        />
                        <Pressable
                          onPress={() => saveAllergy(idx)}
                          style={{ borderRadius: 8, backgroundColor: colors.primary, padding: 8 }}
                        >
                          <Check size={12} color={colors.primaryText} />
                        </Pressable>
                        <Pressable
                          onPress={() => setEditingAllergyIdx(null)}
                          style={{
                            borderRadius: 8,
                            backgroundColor: isDark ? colors.backgroundAlt : '#fff',
                            padding: 8,
                            borderWidth: 1,
                            borderColor: colors.surfaceBorder,
                          }}
                        >
                          <X size={12} color={colors.text} />
                        </Pressable>
                      </View>
                    ) : (
                      <View
                        key={`allergy-${name}-${idx}`}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          maxWidth: '100%',
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(120,53,15,0.7)' : 'rgba(253,230,138,0.8)',
                          backgroundColor: isDark ? 'rgba(69,26,3,0.5)' : amber[50],
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            flexShrink: 1,
                            fontFamily: 'SourceSans3_600SemiBold',
                            fontSize: 12,
                            color: isDark ? '#fef3c7' : amber[950],
                          }}
                        >
                          {name}
                        </Text>
                        {canEdit ? (
                          <>
                            <Pressable
                              hitSlop={6}
                              onPress={() => {
                                setEditingAllergyIdx(idx)
                                setAllergyEdit(name)
                                setShowAllergyForm(false)
                              }}
                              style={{ padding: 2 }}
                            >
                              <Pencil size={11} color={isDark ? amber[300] : amber[700]} />
                            </Pressable>
                            <Pressable hitSlop={6} onPress={() => removeAllergy(idx)} style={{ padding: 2 }}>
                              <Trash2 size={11} color={isDark ? amber[300] : amber[700]} />
                            </Pressable>
                          </>
                        ) : null}
                      </View>
                    ),
                  )}
                </View>
              )}
            </View>

            <View
              style={{
                marginTop: 8,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: colors.surfaceBorder,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                  <Activity size={13} color={isDark ? rose[300] : 'rgba(190,18,60,0.8)'} />
                  <Text
                    style={{
                      fontFamily: 'SourceSans3_600SemiBold',
                      fontSize: 12,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      color: isDark ? 'rgba(253,164,175,0.9)' : 'rgba(190,18,60,0.8)',
                    }}
                  >
                    {t('pet.chronic')}
                  </Text>
                </View>
                {canEdit && !showConditionForm && editingConditionId == null ? (
                  <Pressable
                    onPress={() => setShowConditionForm(true)}
                    hitSlop={8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}
                  >
                    <Plus size={12} color={isDark ? rose[300] : rose[700]} />
                    <Text
                      style={{
                        fontFamily: 'SourceSans3_600SemiBold',
                        fontSize: 12,
                        color: isDark ? rose[300] : rose[700],
                      }}
                    >
                      {t('pet.chronicAdd')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {showConditionForm && canEdit ? (
                <View style={{ gap: 8 }}>
                  <Field
                    value={chronic.name}
                    onChangeText={(v) => setChronic((c) => ({ ...c, name: v }))}
                    placeholder={t('pet.chronicPlaceholder')}
                    autoFocus
                  />
                  <Field
                    value={chronic.notes}
                    onChangeText={(v) => setChronic((c) => ({ ...c, notes: v }))}
                    placeholder={t('pet.chronicNotes')}
                  />
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <PrimaryButton title={t('pet.chronicAdd')} onPress={addCondition} style={{ flex: 1 }} />
                    <Pressable
                      onPress={() => {
                        setShowConditionForm(false)
                        setChronic({ name: '', notes: '' })
                      }}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.secondaryBorder,
                        backgroundColor: colors.secondaryBg,
                        padding: 12,
                      }}
                    >
                      <X size={16} color={colors.secondaryText} />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {conditions.length === 0 && !showConditionForm ? (
                <Body muted style={{ fontSize: 12 }}>{t('pet.chronicEmpty')}</Body>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {conditions.map((c) =>
                    editingConditionId === c.id ? (
                      <View
                        key={`cond-edit-${c.id}`}
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 6,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isDark ? rose[900] : rose[200],
                          backgroundColor: isDark ? 'rgba(76,5,25,0.4)' : 'rgba(255,241,242,0.8)',
                          padding: 8,
                          maxWidth: '100%',
                        }}
                      >
                        <Field
                          style={{ minWidth: 110, flexGrow: 1, paddingVertical: 6, fontSize: 13 }}
                          value={conditionEdit.name}
                          onChangeText={(v) => setConditionEdit((e) => ({ ...e, name: v }))}
                        />
                        <Field
                          style={{ minWidth: 110, flexGrow: 1, paddingVertical: 6, fontSize: 13 }}
                          value={conditionEdit.notes}
                          onChangeText={(v) => setConditionEdit((e) => ({ ...e, notes: v }))}
                          placeholder={t('pet.chronicNotes')}
                        />
                        <Pressable
                          onPress={() => saveCondition(c.id)}
                          style={{ borderRadius: 8, backgroundColor: colors.primary, padding: 8 }}
                        >
                          <Check size={12} color={colors.primaryText} />
                        </Pressable>
                        <Pressable
                          onPress={() => setEditingConditionId(null)}
                          style={{
                            borderRadius: 8,
                            backgroundColor: isDark ? colors.backgroundAlt : '#fff',
                            padding: 8,
                            borderWidth: 1,
                            borderColor: colors.surfaceBorder,
                          }}
                        >
                          <X size={12} color={colors.text} />
                        </Pressable>
                      </View>
                    ) : (
                      <View
                        key={c.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          maxWidth: '100%',
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(136,19,55,0.7)' : 'rgba(254,205,211,0.8)',
                          backgroundColor: isDark ? 'rgba(76,5,25,0.5)' : rose[50],
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            flexShrink: 1,
                            fontFamily: 'SourceSans3_600SemiBold',
                            fontSize: 12,
                            color: isDark ? rose[100] : rose[900],
                          }}
                        >
                          {c.name}
                          {c.notes ? ` · ${c.notes}` : ''}
                        </Text>
                        {canEdit ? (
                          <>
                            <Pressable
                              hitSlop={6}
                              onPress={() => {
                                setEditingConditionId(c.id)
                                setConditionEdit({ name: c.name, notes: c.notes || '' })
                                setShowConditionForm(false)
                              }}
                              style={{ padding: 2 }}
                            >
                              <Pencil size={11} color={isDark ? rose[300] : rose[600]} />
                            </Pressable>
                            <Pressable hitSlop={6} onPress={() => removeCondition(c.id)} style={{ padding: 2 }}>
                              <Trash2 size={11} color={isDark ? rose[300] : rose[600]} />
                            </Pressable>
                          </>
                        ) : null}
                      </View>
                    ),
                  )}
                </View>
              )}
            </View>
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

        {tab === 'historial' && (
          <PetHistorial
            petId={petId}
            canEdit={canEdit}
            onPetWeightChange={(kg) => {
              setPet((p) => (p ? { ...p, weight_kg: kg } : p))
              setForm((f) => ({ ...f, weight_kg: kg != null ? String(kg) : '' }))
            }}
          />
        )}
        {tab === 'seguimiento' && <PetConsultations petId={petId} canEdit={canEdit} />}
        {tab === 'calendario' && <PetCalendar petId={petId} canEdit={canEdit} />}
      </ScrollView>
    </Screen>
  )
}

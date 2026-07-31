import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Bell, Plus, PawPrint, QrCode, Settings, ShieldCheck, Syringe, Users, Weight } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, ApiError } from '../src/api/client'
import { useAuth } from '../src/auth/AuthContext'
import SpeciesIcon from '../src/components/SpeciesIcon'
import {
  Body,
  Chip,
  EmptyState,
  Field,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Surface,
  Title,
} from '../src/components/ui'
import { FREE_PET_LIMIT, SPECIES_OPTIONS } from '../src/constants'
import { useTheme } from '../src/theme/ThemeContext'
import { formatDue } from '../src/utils/dates'

export default function DashboardScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const { ready, isAuthenticated, user, logout } = useAuth()

  const [pets, setPets] = useState([])
  const [alerts, setAlerts] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', species: 'dog', breed: '', chip_id: '' })

  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'PRO'
  const ownedCount = useMemo(() => pets.filter((p) => p.my_role === 'owner').length, [pets])
  const atFreeLimit = !isPro && ownedCount >= FREE_PET_LIMIT

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('nav.dashboard'),
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12, marginRight: 4 }}>
          <Pressable onPress={() => router.push('/pricing')} hitSlop={8}>
            <ShieldCheck size={22} color={colors.icon} />
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
            <Settings size={22} color={colors.icon} />
          </Pressable>
        </View>
      ),
    })
  }, [navigation, t, colors.icon, router])

  const load = useCallback(async () => {
    try {
      const [petsData, subData, alertData] = await Promise.all([
        api('/api/pets'),
        api('/api/subscriptions/me'),
        api('/api/alerts/upcoming?days=14'),
      ])
      setPets(Array.isArray(petsData) ? petsData : [])
      setSubscription(subData)
      setAlerts(alertData?.items || [])
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await logout()
        router.replace('/')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [logout, router])

  useFocusEffect(
    useCallback(() => {
      if (!ready) return
      if (!isAuthenticated) {
        router.replace('/')
        return
      }
      load()
    }, [ready, isAuthenticated, load, router]),
  )

  async function createPet() {
    if (atFreeLimit) {
      Alert.alert(t('dashboard.freeLimitReached'), '', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('pet.upgradeForPro'), onPress: () => router.push('/pricing') },
      ])
      return
    }
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const pet = await api('/api/pets', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          species: form.species,
          breed: form.breed || null,
          chip_id: form.chip_id || null,
        },
      })
      setPets((prev) => [pet, ...prev])
      setShowForm(false)
      setForm({ name: '', species: 'dog', breed: '', chip_id: '' })
    } catch (e) {
      Alert.alert(typeof e.message === 'string' ? e.message : t('dashboard.createError'))
    } finally {
      setSaving(false)
    }
  }

  function nextAlertFor(petId) {
    return alerts.find((a) => String(a.pet_id) === String(petId)) || null
  }

  if (!ready || loading) {
    return (
      <Screen>
        <LoadingState label={t('dashboard.loading')} />
      </Screen>
    )
  }

  const planLabel = isPro ? t('dashboard.planPro') : t('dashboard.planFree')

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 32,
          gap: 20,
        }}
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
        <View style={{ gap: 6 }}>
          <Title style={{ fontSize: 28 }}>
            {t('dashboard.hello')}
            {user?.full_name ? `, ${user.full_name}` : ''}
          </Title>
          <Body muted>
            {planLabel} · {t('dashboard.subtitle')}
            {!isPro ? ` · ${t('dashboard.petSlots', { used: ownedCount, max: FREE_PET_LIMIT })}` : ''}
          </Body>
        </View>

        <PrimaryButton
          title={atFreeLimit ? t('dashboard.upgradeForMore') : t('dashboard.newPet')}
          icon={<Plus size={16} color={colors.primaryText} />}
          onPress={() => {
            if (atFreeLimit) {
              router.push('/pricing')
              return
            }
            setShowForm((v) => !v)
          }}
        />

        {alerts.length > 0 && (
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.alertBorder,
              backgroundColor: colors.alertBg,
              padding: 14,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Bell size={14} color={colors.alertText} />
              <Text
                style={{
                  fontFamily: 'SourceSans3_600SemiBold',
                  fontSize: 12,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: colors.alertText,
                }}
              >
                {t('dashboard.upcomingTitle')}
              </Text>
            </View>
            {alerts.slice(0, 6).map((a) => (
              <Pressable
                key={`${a.kind}-${a.id}`}
                onPress={() =>
                  router.push({
                    pathname: '/pets/[id]',
                    params: { id: String(a.pet_id), tab: a.kind === 'vaccine' ? 'historial' : 'calendario' },
                  })
                }
              >
                <Text style={{ fontFamily: 'SourceSans3_400Regular', color: colors.alertText, fontSize: 14 }}>
                  <Text style={{ fontFamily: 'SourceSans3_600SemiBold' }}>{a.pet_name}</Text>
                  {' · '}
                  {a.title}
                  {' · '}
                  <Text style={{ color: colors.alertMuted }}>{formatDue(a.due_at, i18n.language)}</Text>
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {showForm && !atFreeLimit && (
          <Surface style={{ gap: 10 }}>
            <Field
              placeholder={t('dashboard.name')}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
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
              placeholder={t('dashboard.breed')}
              value={form.breed}
              onChangeText={(v) => setForm((f) => ({ ...f, breed: v }))}
            />
            <Field
              placeholder={t('dashboard.chip')}
              value={form.chip_id}
              onChangeText={(v) => setForm((f) => ({ ...f, chip_id: v }))}
            />
            <PrimaryButton
              title={saving ? t('dashboard.saving') : t('dashboard.save')}
              onPress={createPet}
              loading={saving}
            />
          </Surface>
        )}

        {pets.length === 0 ? (
          <Surface>
            <EmptyState
              icon={<PawPrint size={40} color={colors.primary} />}
              title={t('dashboard.empty')}
              hint={t('dashboard.emptyHint')}
            />
          </Surface>
        ) : (
          pets.map((pet) => {
            const next = nextAlertFor(pet.id)
            return (
              <Pressable
                key={pet.id}
                onPress={() =>
                  router.push({ pathname: '/pets/[id]', params: { id: String(pet.id) } })
                }
              >
                <Surface style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: colors.iconBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SpeciesIcon species={pet.species} size={22} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.text }}>
                          {pet.name}
                        </Text>
                        {pet.my_role && pet.my_role !== 'owner' && (
                          <Chip
                            tone="teal"
                            label={pet.my_role === 'edit' ? t('share.canEdit') : t('share.canRead')}
                            icon={<Users size={10} color={colors.chipText} />}
                          />
                        )}
                      </View>
                      <Body muted style={{ fontSize: 14 }}>
                        {t(`dashboard.${pet.species}`, { defaultValue: pet.species })}
                        {pet.breed ? ` · ${pet.breed}` : ''}
                      </Body>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        backgroundColor: colors.iconBg,
                        padding: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Weight size={12} color={colors.icon} />
                        <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, color: colors.icon }}>
                          {t('dashboard.tileWeight')}
                        </Text>
                      </View>
                      <Text style={{ marginTop: 4, fontFamily: 'SourceSans3_600SemiBold', color: colors.text }}>
                        {pet.weight_kg != null ? `${pet.weight_kg} kg` : t('dashboard.tileEmpty')}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        backgroundColor: colors.iconBg,
                        padding: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Bell size={12} color={colors.icon} />
                        <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, color: colors.icon }}>
                          {t('dashboard.tileNext')}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{ marginTop: 4, fontFamily: 'SourceSans3_600SemiBold', color: colors.text }}
                      >
                        {next
                          ? `${next.title} · ${formatDue(next.due_at, i18n.language)}`
                          : t('dashboard.tileEmpty')}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <SecondaryButton
                      title={t('dashboard.profile')}
                      onPress={() =>
                        router.push({ pathname: '/pets/[id]', params: { id: String(pet.id) } })
                      }
                      style={{ paddingVertical: 8, minHeight: 36, paddingHorizontal: 12 }}
                    />
                    {pet.my_role === 'owner' && (
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: '/pets/[id]/vet-access',
                            params: { id: String(pet.id) },
                          })
                        }
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          backgroundColor: colors.chipBg,
                        }}
                      >
                        <QrCode size={12} color={colors.chipText} />
                        <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: colors.chipText }}>
                          {t('dashboard.vetPin')}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/pets/[id]',
                          params: { id: String(pet.id), tab: 'historial' },
                        })
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: colors.iconBg,
                      }}
                    >
                      <Syringe size={12} color={colors.icon} />
                      <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: colors.icon }}>
                        {t('dashboard.history')}
                      </Text>
                    </Pressable>
                  </View>
                </Surface>
              </Pressable>
            )
          })
        )}
      </ScrollView>
    </Screen>
  )
}

import { useCallback, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Bell, CalendarDays, Syringe } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, ApiError } from '../../src/api/client'
import { useAuth } from '../../src/auth/AuthContext'
import {
  Body,
  EmptyState,
  LoadingState,
  Screen,
  Surface,
} from '../../src/components/ui'
import { useTheme } from '../../src/theme/ThemeContext'
import { formatDue } from '../../src/utils/dates'

export default function AlertsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const { logout } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api('/api/alerts/upcoming?days=30')
      setAlerts(data?.items || [])
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
      load()
    }, [load]),
  )

  if (loading) {
    return (
      <Screen>
        <LoadingState label={t('alerts.loading')} />
      </Screen>
    )
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 24,
          gap: 12,
          flexGrow: 1,
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
        <Body muted>{t('alerts.subtitle')}</Body>

        {alerts.length === 0 ? (
          <EmptyState
            icon={<Bell size={28} color={colors.icon} />}
            title={t('alerts.empty')}
            hint={t('alerts.emptyHint')}
          />
        ) : (
          alerts.map((a) => {
            const Icon = a.kind === 'vaccine' ? Syringe : CalendarDays
            return (
              <Pressable
                key={`${a.kind}-${a.id}`}
                onPress={() =>
                  router.push({
                    pathname: '/pets/[id]',
                    params: {
                      id: String(a.pet_id),
                      tab: a.kind === 'vaccine' ? 'historial' : 'calendario',
                    },
                  })
                }
              >
                <Surface style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: colors.iconBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} color={colors.icon} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: colors.text }}
                    >
                      {a.pet_name}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 14, color: colors.textMuted }}
                    >
                      {a.title}
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        fontFamily: 'SourceSans3_600SemiBold',
                        fontSize: 12,
                        color: colors.primary,
                      }}
                    >
                      {formatDue(a.due_at, i18n.language)}
                    </Text>
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

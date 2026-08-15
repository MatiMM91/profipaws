import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { Tabs, usePathname } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Bell, PawPrint, Settings, ShieldCheck } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../../src/api/client'
import { useAuth } from '../../src/auth/AuthContext'
import { useTheme } from '../../src/theme/ThemeContext'

const TAB_BAR_CONTENT_HEIGHT = 52

export default function TabsLayout() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { token } = useAuth()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom, 8)
  const [alertCount, setAlertCount] = useState(0)

  const loadAlertCount = useCallback(async () => {
    if (!token) {
      setAlertCount(0)
      return
    }
    try {
      const data = await api('/api/alerts/upcoming?days=30')
      setAlertCount((data?.items || []).length)
    } catch {
      // Keep last known count on transient errors
    }
  }, [token])

  useEffect(() => {
    loadAlertCount()
  }, [loadAlertCount, pathname])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadAlertCount()
    })
    return () => sub.remove()
  }, [loadAlertCount])

  const badge =
    alertCount > 0 ? (alertCount > 99 ? '99+' : alertCount) : undefined

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'DMSans_600SemiBold' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.backgroundAlt,
          borderTopColor: colors.surfaceBorder,
          borderTopWidth: 1,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          fontFamily: 'SourceSans3_600SemiBold',
          fontSize: 11,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('nav.pets'),
          tabBarLabel: t('nav.pets'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <PawPrint size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t('nav.alerts'),
          tabBarLabel: t('nav.alerts'),
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
          tabBarBadge: badge,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            color: '#ffffff',
            fontSize: 10,
            fontFamily: 'SourceSans3_600SemiBold',
            minWidth: 16,
            height: 16,
            lineHeight: 14,
            borderRadius: 8,
          },
        }}
      />
      <Tabs.Screen
        name="pricing"
        options={{
          title: t('nav.plans'),
          tabBarLabel: t('nav.plans'),
          tabBarIcon: ({ color, size }) => <ShieldCheck size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav.settings'),
          tabBarLabel: t('nav.settings'),
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  )
}

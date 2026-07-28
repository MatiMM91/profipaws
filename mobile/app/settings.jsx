import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PreferenceControls from '../src/components/PreferenceControls'
import BrandLogo from '../src/components/BrandLogo'
import { Body, PrimaryButton, Screen, Surface, Title } from '../src/components/ui'
import { useAuth } from '../src/auth/AuthContext'
import { useTheme } from '../src/theme/ThemeContext'
import { API_URL } from '../src/constants'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const { user, logout } = useAuth()

  async function handleLogout() {
    await logout()
    router.replace('/')
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 20 }}>
        <Surface style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <BrandLogo size={52} />
          <View style={{ flex: 1 }}>
            <Title style={{ fontSize: 22 }}>{user?.full_name || 'Profipaws'}</Title>
            <Body muted>{user?.email}</Body>
          </View>
        </Surface>

        <Surface style={{ gap: 12 }}>
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: colors.text }}>
            {t('nav.language')} / {t('nav.theme')}
          </Text>
          <PreferenceControls />
        </Surface>

        <Surface style={{ gap: 8 }}>
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: colors.text }}>
            API
          </Text>
          <Body muted style={{ fontSize: 13 }}>{API_URL}</Body>
          <Pressable onPress={() => router.push('/pricing')}>
            <Body style={{ color: colors.primary, fontFamily: 'SourceSans3_600SemiBold' }}>
              {t('nav.plans')} →
            </Body>
          </Pressable>
        </Surface>

        <PrimaryButton
          title={t('nav.logout')}
          onPress={() =>
            Alert.alert(t('nav.logout'), '', [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('nav.logout'), style: 'destructive', onPress: handleLogout },
            ])
          }
          icon={<LogOut size={16} color={colors.primaryText} />}
          style={{ backgroundColor: colors.danger }}
        />
      </ScrollView>
    </Screen>
  )
}

import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  useFonts,
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
} from '@expo-google-fonts/source-sans-3'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { I18nextProvider } from 'react-i18next'
import { AuthProvider } from '../src/auth/AuthContext'
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext'
import i18n, { initI18n } from '../src/i18n'

function RootNavigator() {
  const { colors, isDark } = useTheme()

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: 'DMSans_600SemiBold' },
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="pricing" options={{ title: 'Planes' }} />
        <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
        <Stack.Screen name="pets/[id]/index" options={{ title: 'Mascota' }} />
        <Stack.Screen name="pets/[id]/vet-access" options={{ title: 'Acceso vet' }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false)
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
  })

  useEffect(() => {
    initI18n().then(() => setI18nReady(true))
  }, [])

  if (!fontsLoaded || !i18nReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ecfeff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </ThemeProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

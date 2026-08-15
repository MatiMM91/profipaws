import { Stack } from 'expo-router'
import { useTheme } from '../../../src/theme/ThemeContext'

export default function PetsStackLayout() {
  const { colors } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'DMSans_600SemiBold' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="[id]/index" options={{ title: 'Mascota' }} />
      <Stack.Screen name="[id]/vet-access" options={{ title: 'Acceso vet' }} />
      <Stack.Screen name="[id]/share" options={{ title: 'Compartir' }} />
      <Stack.Screen name="[id]/tools" options={{ title: 'Herramientas' }} />
    </Stack>
  )
}

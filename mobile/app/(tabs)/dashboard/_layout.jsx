import { Stack } from 'expo-router'
import { useTheme } from '../../../src/theme/ThemeContext'

export default function DashboardStackLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Mascotas' }} />
    </Stack>
  )
}

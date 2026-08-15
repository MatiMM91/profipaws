import { ScrollView, View } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PetSharePanel from '../../../../src/components/PetSharePanel'
import { Screen, Surface } from '../../../../src/components/ui'

export default function PetShareScreen() {
  const { id } = useLocalSearchParams()
  const petId = Array.isArray(id) ? id[0] : id
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  return (
    <Screen>
      <Stack.Screen options={{ title: t('share.title') }} />
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Surface>
          <PetSharePanel petId={petId} />
        </Surface>
      </ScrollView>
    </Screen>
  )
}

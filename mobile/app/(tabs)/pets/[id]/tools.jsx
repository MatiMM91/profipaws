import { useCallback, useState } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, ApiError } from '../../../../src/api/client'
import { useAuth } from '../../../../src/auth/AuthContext'
import PetTools from '../../../../src/components/PetTools'
import { LoadingState, Screen, Surface } from '../../../../src/components/ui'

export default function PetToolsScreen() {
  const { id } = useLocalSearchParams()
  const petId = Array.isArray(id) ? id[0] : id
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { logout } = useAuth()
  const [pet, setPet] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [petData, subData] = await Promise.all([
        api(`/api/pets/${petId}`),
        api('/api/subscriptions/me'),
      ])
      setPet(petData)
      setSubscription(subData)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await logout()
        router.replace('/')
      }
    } finally {
      setLoading(false)
    }
  }, [petId, logout, router])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'PRO'

  return (
    <Screen>
      <Stack.Screen options={{ title: t('pet.tools') }} />
      {loading || !pet ? (
        <LoadingState />
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 32,
          }}
        >
          <Surface>
            <PetTools petId={petId} isPro={isPro} />
          </Surface>
        </ScrollView>
      )}
    </Screen>
  )
}

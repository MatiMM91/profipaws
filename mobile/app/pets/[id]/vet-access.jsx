import { useState } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Clock, KeyRound, QrCode } from 'lucide-react-native'
import QRCode from 'react-native-qrcode-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../../../src/api/client'
import { Body, PrimaryButton, Screen, SecondaryButton, Surface, Subtitle, Title } from '../../../src/components/ui'
import { useTheme } from '../../../src/theme/ThemeContext'
import { formatDateTime } from '../../../src/utils/dates'
import { Alert } from 'react-native'

export default function VetAccessScreen() {
  const { id } = useLocalSearchParams()
  const petId = Array.isArray(id) ? id[0] : id
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [access, setAccess] = useState(null)
  const [loading, setLoading] = useState(false)

  async function generatePin() {
    setLoading(true)
    try {
      const data = await api(`/api/pets/${petId}/access-pin`, { method: 'POST' })
      setAccess(data)
    } catch {
      Alert.alert(t('vet.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, padding: 20, paddingBottom: insets.bottom + 24, justifyContent: 'center' }}>
        <Surface style={{ alignItems: 'center', gap: 16, paddingVertical: 28 }}>
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
            <QrCode size={28} color={colors.icon} />
          </View>

          <Title style={{ fontSize: 24, textAlign: 'center' }}>{t('vet.title')}</Title>
          <Subtitle style={{ textAlign: 'center' }}>{t('vet.subtitle')}</Subtitle>

          {!access ? (
            <PrimaryButton
              title={loading ? t('vet.generating') : t('vet.generate')}
              onPress={generatePin}
              loading={loading}
              icon={<KeyRound size={16} color={colors.primaryText} />}
              style={{ marginTop: 8, alignSelf: 'stretch' }}
            />
          ) : (
            <View style={{ alignItems: 'center', gap: 18, width: '100%' }}>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 44,
                  letterSpacing: 10,
                  color: colors.text,
                }}
              >
                {access.pin}
              </Text>

              {access.qr_payload ? (
                <View
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: colors.surfaceBorder,
                  }}
                >
                  <QRCode value={String(access.qr_payload)} size={200} />
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color={colors.textMuted} />
                <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
                  {t('vet.expires')}: {formatDateTime(access.expires_at, i18n.language)}
                </Body>
              </View>

              <SecondaryButton
                title={t('vet.regenerate')}
                onPress={generatePin}
                loading={loading}
                style={{ alignSelf: 'stretch' }}
              />
            </View>
          )}
        </Surface>
      </View>
    </Screen>
  )
}

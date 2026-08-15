import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { FileDown, ShieldCheck } from 'lucide-react-native'
import { API_URL } from '../constants'
import { getToken } from '../auth/session'
import { useTheme } from '../theme/ThemeContext'
import { PrimaryButton, SecondaryButton, Subtitle } from './ui'

async function downloadAndShare(path, filename) {
  const token = await getToken()
  const target = `${FileSystem.cacheDirectory}${filename}`
  const result = await FileSystem.downloadAsync(`${API_URL}${path}`, target, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (result.status !== 200) {
    const err = new Error('export')
    err.status = result.status
    throw err
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri)
  } else {
    Alert.alert(filename, result.uri)
  }
}

export default function PetTools({ petId, isPro }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const router = useRouter()
  const [exporting, setExporting] = useState(null)

  async function runExport(path, filename, key, requiresPro) {
    if (requiresPro && !isPro) {
      Alert.alert(t('pet.exportProHint'), '', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('pet.upgradeForPro'), onPress: () => router.push('/pricing') },
      ])
      return
    }
    setExporting(key)
    try {
      await downloadAndShare(path, filename)
    } catch (e) {
      if (e.status === 403) Alert.alert(t('pet.proRequired'))
      else Alert.alert(t('pet.exportError'))
    } finally {
      setExporting(null)
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.text }}>
        {t('pet.tools')}
      </Text>
      <Subtitle>{t('pet.proToolsHint')}</Subtitle>

      <PrimaryButton
        title={exporting === 'pass' ? t('pet.exporting') : t('pet.vaccinePassAction')}
        icon={<ShieldCheck size={16} color={colors.primaryText} />}
        onPress={() =>
          runExport(`/api/pets/${petId}/export/vaccine-pass`, `profipaws-pass-${petId}.pdf`, 'pass', false)
        }
        loading={exporting === 'pass'}
      />

      <SecondaryButton
        title={exporting === 'pdf' ? t('pet.exporting') : t('pet.exportPdfAction')}
        icon={<FileDown size={16} color={colors.secondaryText} />}
        onPress={() =>
          runExport(`/api/pets/${petId}/export/pdf`, `profipaws-historial-${petId}.pdf`, 'pdf', true)
        }
        loading={exporting === 'pdf'}
      />

      <SecondaryButton
        title={exporting === 'json' ? t('pet.exporting') : t('pet.exportJsonAction')}
        onPress={() =>
          runExport(`/api/pets/${petId}/export/json`, `profipaws-${petId}.json`, 'json', true)
        }
        loading={exporting === 'json'}
      />
    </View>
  )
}

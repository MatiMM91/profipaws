import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { FileDown, ShieldCheck, Trash2, Users } from 'lucide-react-native'
import { api } from '../api/client'
import { API_URL } from '../constants'
import { getToken } from '../auth/session'
import { useTheme } from '../theme/ThemeContext'
import { Body, Field, PrimaryButton, SecondaryButton, Subtitle } from './ui'

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

export default function PetTools({ petId, isPro, canEdit, isOwner }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const router = useRouter()
  const [shares, setShares] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('read')
  const [sharing, setSharing] = useState(false)
  const [exporting, setExporting] = useState(null)

  async function loadShares() {
    if (!isOwner) return
    try {
      const data = await api(`/api/pets/${petId}/shares`)
      setShares(Array.isArray(data) ? data : [])
    } catch {
      setShares([])
    }
  }

  useEffect(() => {
    loadShares()
  }, [petId, isOwner])

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

  async function addShare() {
    if (!email.trim()) return
    setSharing(true)
    try {
      await api(`/api/pets/${petId}/shares`, {
        method: 'POST',
        body: { email: email.trim(), role },
      })
      setEmail('')
      await loadShares()
    } catch {
      Alert.alert(t('share.error'))
    } finally {
      setSharing(false)
    }
  }

  function removeShare(id) {
    Alert.alert(t('share.removeConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('share.remove'),
        style: 'destructive',
        onPress: async () => {
          await api(`/api/pets/${petId}/shares/${id}`, { method: 'DELETE' })
          await loadShares()
        },
      },
    ])
  }

  return (
    <View style={{ gap: 20 }}>
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

      {isOwner && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Users size={18} color={colors.icon} />
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.text }}>
              {t('share.title')}
            </Text>
          </View>
          <Body muted>{t('share.hint')}</Body>
          <Field
            placeholder={t('share.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['read', 'edit'].map((r) => {
              const active = role === r
              return (
                <Pressable
                  key={r}
                  onPress={() => setRole(r)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    backgroundColor: active ? colors.primary : colors.iconBg,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'SourceSans3_600SemiBold',
                      color: active ? colors.primaryText : colors.icon,
                    }}
                  >
                    {r === 'read' ? t('share.canRead') : t('share.canEdit')}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <PrimaryButton
            title={sharing ? t('share.sharing') : t('share.add')}
            onPress={addShare}
            loading={sharing}
          />

          {shares.length === 0 ? (
            <Body muted>{t('share.empty')}</Body>
          ) : (
            shares.map((s) => (
              <View
                key={s.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.surfaceBorder,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Body>{s.email || s.user_email}</Body>
                  <Body muted style={{ fontSize: 12 }}>
                    {s.role === 'edit' ? t('share.canEdit') : t('share.canRead')}
                  </Body>
                </View>
                <Pressable onPress={() => removeShare(s.id)} hitSlop={8}>
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  )
}

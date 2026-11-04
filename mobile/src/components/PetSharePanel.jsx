import { useCallback, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Share2, Trash2, Users } from 'lucide-react-native'
import { api } from '../api/client'
import { useTheme } from '../theme/ThemeContext'
import { Body, Field, PrimaryButton } from './ui'

export default function PetSharePanel({ petId }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const [shares, setShares] = useState([])
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('read')
  const [sharing, setSharing] = useState(false)

  const loadShares = useCallback(async () => {
    try {
      const data = await api(`/api/pets/${petId}/shares`)
      setShares(Array.isArray(data) ? data : [])
    } catch {
      setShares([])
    }
  }, [petId])

  useFocusEffect(
    useCallback(() => {
      loadShares()
    }, [loadShares]),
  )

  async function addShare() {
    if (!email.trim()) return
    setSharing(true)
    try {
      await api(`/api/pets/${petId}/shares`, {
        method: 'POST',
        body: { email: email.trim(), permission },
      })
      setEmail('')
      setPermission('read')
      await loadShares()
      Alert.alert(t('share.invited'))
    } catch (e) {
      Alert.alert(typeof e?.message === 'string' ? e.message : t('share.error'))
    } finally {
      setSharing(false)
    }
  }

  async function updatePermission(shareId, next) {
    try {
      await api(`/api/pets/${petId}/shares/${shareId}`, {
        method: 'PATCH',
        body: { permission: next },
      })
      await loadShares()
    } catch {
      Alert.alert(t('share.error'))
    }
  }

  function removeShare(shareId) {
    Alert.alert(t('share.removeConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('share.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/api/pets/${petId}/shares/${shareId}`, { method: 'DELETE' })
            setShares((prev) => prev.filter((s) => s.id !== shareId))
          } catch {
            Alert.alert(t('share.error'))
          }
        },
      },
    ])
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Share2 size={18} color={colors.icon} />
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.text }}>
          {t('share.title')}
        </Text>
      </View>
      <Body muted>{t('share.hint')}</Body>

      <Field
        placeholder={t('share.email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {['read', 'edit'].map((r) => {
          const active = permission === r
          return (
            <Pressable
              key={r}
              onPress={() => setPermission(r)}
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
              gap: 10,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.surfaceBorder,
              backgroundColor: colors.backgroundAlt,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Users size={16} color={colors.icon} />
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 15, color: colors.text }}
                >
                  {s.full_name || s.email}
                </Text>
                {s.full_name ? (
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: colors.textMuted }}
                  >
                    {s.email}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => removeShare(s.id)} hitSlop={8} accessibilityLabel={t('share.remove')}>
                <Trash2 size={16} color={colors.danger} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['read', 'edit'].map((r) => {
                const active = s.permission === r
                return (
                  <Pressable
                    key={r}
                    onPress={() => updatePermission(s.id, r)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: active ? colors.primary : colors.iconBg,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'SourceSans3_600SemiBold',
                        fontSize: 12,
                        color: active ? colors.primaryText : colors.icon,
                      }}
                    >
                      {r === 'read' ? t('share.canRead') : t('share.canEdit')}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))
      )}
    </View>
  )
}

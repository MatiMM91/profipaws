import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Languages, Moon, Sun } from 'lucide-react-native'
import { useTheme } from '../theme/ThemeContext'
import { cycleLanguage, setAppLanguage } from '../i18n'

export default function PreferenceControls({ compact = false }) {
  const { t, i18n } = useTranslation()
  const { colors, isDark, toggleTheme } = useTheme()

  async function nextLang() {
    const next = cycleLanguage(i18n.language?.slice(0, 2) || 'es')
    await setAppLanguage(next)
  }

  const btn = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: compact ? 10 : 12,
    paddingVertical: compact ? 8 : 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Pressable onPress={nextLang} style={btn} accessibilityLabel={t('nav.language')}>
        <Languages size={16} color={colors.icon} />
        <Text style={{ fontFamily: 'SourceSans3_600SemiBold', color: colors.text, fontSize: 13 }}>
          {(i18n.language || 'es').slice(0, 2).toUpperCase()}
        </Text>
      </Pressable>
      <Pressable onPress={toggleTheme} style={btn} accessibilityLabel={t('nav.theme')}>
        {isDark ? <Sun size={16} color={colors.icon} /> : <Moon size={16} color={colors.icon} />}
        <Text style={{ fontFamily: 'SourceSans3_600SemiBold', color: colors.text, fontSize: 13 }}>
          {isDark ? t('nav.light') : t('nav.dark')}
        </Text>
      </Pressable>
    </View>
  )
}

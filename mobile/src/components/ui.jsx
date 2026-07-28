import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'

export function Screen({ children, style }) {
  const { colors } = useTheme()
  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      {children}
    </View>
  )
}

export function Surface({ children, style }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export function Title({ children, style }) {
  const { colors } = useTheme()
  return (
    <Text style={[{ fontFamily: 'DMSans_700Bold', fontSize: 28, color: colors.text }, style]}>
      {children}
    </Text>
  )
}

export function Subtitle({ children, style }) {
  const { colors } = useTheme()
  return (
    <Text
      style={[
        { fontFamily: 'SourceSans3_400Regular', fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function Body({ children, style, muted }) {
  const { colors } = useTheme()
  return (
    <Text
      style={[
        {
          fontFamily: 'SourceSans3_400Regular',
          fontSize: 15,
          color: muted ? colors.textMuted : colors.text,
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function PrimaryButton({ title, onPress, disabled, loading, icon, style }) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: colors.primary,
          opacity: disabled || loading ? 0.55 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryText} />
      ) : (
        <>
          {icon}
          <Text style={[styles.btnText, { color: colors.primaryText }]}>{title}</Text>
        </>
      )}
    </Pressable>
  )
}

export function SecondaryButton({ title, onPress, disabled, icon, style }) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: colors.secondaryBg,
          borderColor: colors.secondaryBorder,
          borderWidth: 1,
          opacity: disabled ? 0.55 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.btnText, { color: colors.secondaryText }]}>{title}</Text>
    </Pressable>
  )
}

export function Field({ style, ...props }) {
  const { colors } = useTheme()
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[
        {
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          backgroundColor: colors.backgroundAlt,
          color: colors.text,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontFamily: 'SourceSans3_400Regular',
          fontSize: 16,
        },
        style,
      ]}
      {...props}
    />
  )
}

export function Chip({ label, icon, tone = 'default' }) {
  const { colors } = useTheme()
  const bg = tone === 'teal' ? colors.chipBg : colors.iconBg
  const fg = tone === 'teal' ? colors.chipText : colors.icon
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      {icon}
      <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: fg }}>{label}</Text>
    </View>
  )
}

export function LoadingState({ label }) {
  const { colors } = useTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Body muted style={{ marginTop: 12 }}>{label}</Body> : null}
    </View>
  )
}

export function EmptyState({ icon, title, hint }) {
  return (
    <View style={[styles.center, { padding: 32 }]}>
      {icon}
      <Body style={{ marginTop: 12, textAlign: 'center' }}>{title}</Body>
      {hint ? (
        <Body muted style={{ marginTop: 8, textAlign: 'center', maxWidth: 280 }}>
          {hint}
        </Body>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

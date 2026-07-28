import { useCallback, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../src/api/client'
import {
  Body,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Surface,
  Subtitle,
  Title,
} from '../src/components/ui'
import { useTheme } from '../src/theme/ThemeContext'

export default function PricingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [interval, setIntervalBilling] = useState('month')
  const [busy, setBusy] = useState(false)

  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'PRO'
  const freeFeatures = t('pricing.freeFeatures', { returnObjects: true })
  const proFeatures = t('pricing.proFeatures', { returnObjects: true })

  const load = useCallback(async () => {
    try {
      const data = await api('/api/subscriptions/me')
      setSubscription(data)
      if (data?.interval === 'year' || data?.billing_interval === 'year') {
        setIntervalBilling('year')
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  async function checkout() {
    setBusy(true)
    try {
      const data = await api('/api/subscriptions/checkout', {
        method: 'POST',
        body: { interval: interval === 'year' ? 'year' : 'month' },
      })
      if (data?.url) {
        await Linking.openURL(data.url)
      } else {
        Alert.alert(t('pricing.stripeMissing'))
      }
    } catch (e) {
      Alert.alert(e.message || t('pricing.stripeMissing'))
    } finally {
      setBusy(false)
    }
  }

  async function changeInterval(next) {
    setBusy(true)
    try {
      await api('/api/subscriptions/change-interval', {
        method: 'POST',
        body: { interval: next },
      })
      setIntervalBilling(next)
      Alert.alert(next === 'year' ? t('pricing.changedToYearly') : t('pricing.changedToMonthly'))
      await load()
    } catch {
      Alert.alert(t('pricing.changeError'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState label={t('pricing.loadingPlan')} />
      </Screen>
    )
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Title style={{ fontSize: 28 }}>{t('pricing.title')}</Title>
          <Subtitle>{t('pricing.subtitle')}</Subtitle>
        </View>

        <View
          style={{
            flexDirection: 'row',
            padding: 4,
            borderRadius: 14,
            backgroundColor: colors.iconBg,
            gap: 4,
          }}
        >
          {['month', 'year'].map((key) => {
            const active = interval === key
            return (
              <Pressable
                key={key}
                onPress={() => setIntervalBilling(key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: active ? colors.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'SourceSans3_600SemiBold',
                    color: active ? colors.primaryText : colors.icon,
                  }}
                >
                  {key === 'month' ? t('pricing.monthly') : t('pricing.yearly')}
                  {key === 'year' ? ` ${t('pricing.saveBadge')}` : ''}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Surface style={{ gap: 12 }}>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 20, color: colors.text }}>
            {t('pricing.free')}
          </Text>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 32, color: colors.text }}>
            {t('pricing.freePrice')}
            <Text style={{ fontSize: 14, fontFamily: 'SourceSans3_400Regular', color: colors.textMuted }}>
              {' '}
              {t('pricing.forever')}
            </Text>
          </Text>
          <Body muted>{t('pricing.freeNote')}</Body>
          {(Array.isArray(freeFeatures) ? freeFeatures : []).map((f) => (
            <View key={f} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Check size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <Body style={{ flex: 1 }}>{f}</Body>
            </View>
          ))}
          <SecondaryButton
            title={!isPro ? t('pricing.currentPlan') : t('pricing.freeIncluded')}
            disabled
          />
        </Surface>

        <Surface style={{ gap: 12, borderColor: colors.primary, borderWidth: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 20, color: colors.text }}>
              {t('pricing.pro')}
            </Text>
            <View style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: colors.primaryText, fontFamily: 'SourceSans3_600SemiBold', fontSize: 11 }}>
                {t('pricing.recommended')}
              </Text>
            </View>
          </View>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 32, color: colors.text }}>
            {interval === 'year' ? t('pricing.proPriceYearly') : t('pricing.proPriceMonthly')}
            <Text style={{ fontSize: 14, fontFamily: 'SourceSans3_400Regular', color: colors.textMuted }}>
              {interval === 'year' ? t('pricing.perYear') : t('pricing.perMonth')}
            </Text>
          </Text>
          <Body muted>
            {interval === 'year' ? t('pricing.yearlyNote') : t('pricing.monthlyNote')}
          </Body>
          {(Array.isArray(proFeatures) ? proFeatures : []).map((f) => (
            <View key={f} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Check size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <Body style={{ flex: 1 }}>{f}</Body>
            </View>
          ))}

          {!isPro ? (
            <PrimaryButton
              title={busy ? t('pricing.redirecting') : t('pricing.upgrade')}
              onPress={checkout}
              loading={busy}
            />
          ) : (
            <View style={{ gap: 8 }}>
              <SecondaryButton title={t('pricing.yourPlan')} disabled />
              <PrimaryButton
                title={
                  busy
                    ? t('pricing.changing')
                    : interval === 'year'
                      ? t('pricing.switchToMonthly')
                      : t('pricing.switchToYearly')
                }
                onPress={() => changeInterval(interval === 'year' ? 'month' : 'year')}
                loading={busy}
              />
              <Body muted style={{ fontSize: 12 }}>{t('pricing.switchHint')}</Body>
            </View>
          )}
        </Surface>

        <Body muted style={{ textAlign: 'center', fontSize: 12 }}>
          {t('pricing.cancelAnytime')}
          {'\n'}
          {t('pricing.vatNote')}
        </Body>

        <SecondaryButton title={t('pet.back')} onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  )
}

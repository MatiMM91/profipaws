import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Building2, Construction, QrCode, Shield } from 'lucide-react-native'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'
import BrandLogo from '../src/components/BrandLogo'
import PreferenceControls from '../src/components/PreferenceControls'
import { Body, Field, PrimaryButton, SecondaryButton, Subtitle, Title } from '../src/components/ui'
import { useAuth } from '../src/auth/AuthContext'
import { useTheme } from '../src/theme/ThemeContext'
import { API_URL, GOOGLE_CLIENT_ID, MAINTENANCE_MODE, WEB_URL } from '../src/constants'
import { brand } from '../src/theme/colors'
import { setSession } from '../src/auth/session'

WebBrowser.maybeCompleteAuthSession()

const FEATURES = [
  { titleKey: 'landing.featureClinical', descKey: 'landing.featureClinicalDesc', icon: Shield },
  { titleKey: 'landing.featureVet', descKey: 'landing.featureVetDesc', icon: QrCode },
  { titleKey: 'landing.featureB2b', descKey: 'landing.featureB2bDesc', icon: Building2 },
]

const isLocalApi = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[0-1])\./i.test(API_URL)
const isExpoGo = Constants.appOwnership === 'expo'
const DEFAULT_WEB_URL = 'https://profipaws.vercel.app'

function createNonce() {
  const bytes = new Uint8Array(24)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function startMobileSession(nonce) {
  const res = await fetch(`${API_URL}/api/auth/mobile-session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'No se pudo iniciar el login móvil')
  }
}

async function pollMobileSession(nonce, { signal, timeoutMs = 180000 } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (signal?.aborted) throw new Error('Login cancelado')
    const res = await fetch(`${API_URL}/api/auth/mobile-session/${encodeURIComponent(nonce)}`)
    if (!res.ok) {
      await sleep(1200)
      continue
    }
    const data = await res.json()
    if (data.status === 'ready' && data.access_token) return data
    if (data.status === 'expired') {
      throw new Error('La sesión de login expiró. Inténtalo de nuevo.')
    }
    await sleep(1200)
  }
  throw new Error('Tiempo de espera agotado. Cierra el navegador e inténtalo otra vez.')
}

function networkHelpMessage(errMsg) {
  if (/network request failed|failed to fetch|network error/i.test(String(errMsg || ''))) {
    return `No se pudo alcanzar el API:\n${API_URL}\n\nComprueba la conexión o reinicia Expo tras cambiar .env (npx expo start -c).`
  }
  return null
}

export default function LandingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { ready, isAuthenticated, loginDev, refreshSession } = useAuth()
  const [email, setEmail] = useState('demo@profipaws.com')
  const [loading, setLoading] = useState(false)
  const canDevLogin = isLocalApi && !GOOGLE_CLIENT_ID
  const webBase = WEB_URL || DEFAULT_WEB_URL

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [ready, isAuthenticated, router])

  async function handleGoogleBridge() {
    if (MAINTENANCE_MODE) {
      Alert.alert(t('landing.maintenanceLoginDenied'))
      return
    }
    setLoading(true)
    const controller = new AbortController()
    try {
      const nonce = createNonce()
      await startMobileSession(nonce)
      const authUrl = `${webBase}/mobile-auth?nonce=${encodeURIComponent(nonce)}`

      const pollPromise = pollMobileSession(nonce, { signal: controller.signal })
      // openBrowserAsync: no deep links needed; app polls API and dismisses the browser.
      const browserPromise = WebBrowser.openBrowserAsync(authUrl, {
        createTask: false,
        showInRecents: true,
      })

      const data = await pollPromise
      controller.abort()
      try {
        await WebBrowser.dismissBrowser()
      } catch {
        /* browser may already be closed */
      }
      await browserPromise.catch(() => null)

      if (!data?.access_token) throw new Error(t('landing.loginFailed'))
      await setSession(data.access_token, data.user || null)
      if (typeof refreshSession === 'function') await refreshSession()
      router.replace('/dashboard')
    } catch (e) {
      controller.abort()
      try {
        await WebBrowser.dismissBrowser()
      } catch {
        /* ignore */
      }
      if (!/cancel|abort/i.test(String(e.message))) {
        Alert.alert('Error', networkHelpMessage(e.message) || e.message || t('landing.loginFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDevLogin() {
    if (MAINTENANCE_MODE) {
      Alert.alert(t('landing.maintenanceLoginDenied'))
      return
    }
    if (!canDevLogin) {
      await handleGoogleBridge()
      return
    }
    setLoading(true)
    try {
      await loginDev(email.trim() || 'demo@profipaws.com')
      router.replace('/dashboard')
    } catch (e) {
      Alert.alert('Error', networkHelpMessage(e.message) || e.message || t('landing.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const gradient = isDark
    ? [brand[950], brand[900], brand[950]]
    : [brand[50], '#ffffff', '#ccfbf1']

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
            gap: 28,
          }}
        >
          {MAINTENANCE_MODE && (
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.alertBorder,
                backgroundColor: colors.alertBg,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Construction size={16} color={colors.alertText} />
              <Text style={{ color: colors.alertText, fontFamily: 'SourceSans3_600SemiBold', fontSize: 13 }}>
                {t('landing.maintenanceBanner')}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BrandLogo size={44} />
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: colors.text }}>
                Profipaws
              </Text>
            </View>
            <PreferenceControls compact />
          </View>

          <View style={{ gap: 12, paddingTop: 24 }}>
            <Text
              style={{
                fontFamily: 'SourceSans3_600SemiBold',
                fontSize: 13,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: colors.primary,
              }}
            >
              {t('landing.eyebrow')}
            </Text>
            <Title style={{ fontSize: 40, lineHeight: 46 }}>{t('landing.headline')}</Title>
            <Subtitle style={{ fontSize: 17, lineHeight: 26 }}>{t('landing.subtitle')}</Subtitle>
          </View>

          <View style={{ gap: 12 }}>
            <PrimaryButton
              title={canDevLogin ? t('landing.ctaStart') : t('nav.signInGoogle')}
              onPress={canDevLogin ? handleDevLogin : handleGoogleBridge}
              loading={loading}
              icon={<ArrowRight size={18} color={colors.primaryText} />}
            />
            <SecondaryButton
              title={t('landing.ctaPlans')}
              onPress={() => {
                if (isAuthenticated) router.push('/pricing')
                else {
                  Alert.alert(
                    t('nav.signInGoogle'),
                    'Inicia sesión primero para ver y gestionar tu plan.',
                  )
                }
              }}
            />
          </View>

          <View
            style={{
              gap: 8,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface,
              padding: 14,
            }}
          >
            <Body muted style={{ fontSize: 12 }}>
              API: {API_URL}
            </Body>
            <Body muted style={{ fontSize: 12 }}>
              {isExpoGo ? 'Expo Go' : 'Dev build'} · login Google vía web + polling
            </Body>
            {canDevLogin && (
              <>
                <Field
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="demo@profipaws.com"
                />
                <PrimaryButton
                  title={t('landing.ctaStart')}
                  onPress={handleDevLogin}
                  loading={loading}
                />
              </>
            )}
          </View>

          <View style={{ gap: 14, marginTop: 8 }}>
            {FEATURES.map(({ titleKey, descKey, icon: Icon }) => (
              <View
                key={titleKey}
                style={{
                  flexDirection: 'row',
                  gap: 14,
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.surfaceBorder,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: colors.iconBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={22} color={colors.icon} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: colors.text }}>
                    {t(titleKey)}
                  </Text>
                  <Body muted style={{ fontSize: 14, lineHeight: 20 }}>
                    {t(descKey)}
                  </Body>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

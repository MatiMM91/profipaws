import { useEffect, useState } from 'react'
import {
  Alert,
  AppState,
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
import * as Clipboard from 'expo-clipboard'
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
const CLIP_PREFIX = 'PROFIPAWS_AUTH_V1:'
const AUTH_TIMEOUT_MS = 5 * 60 * 1000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseClipboardAuth(raw) {
  if (!raw || typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text.startsWith(CLIP_PREFIX)) return null
  try {
    const data = JSON.parse(text.slice(CLIP_PREFIX.length))
    if (!data?.access_token || typeof data.access_token !== 'string') return null
    if (data.ts && Date.now() - Number(data.ts) > AUTH_TIMEOUT_MS) return null
    return {
      access_token: data.access_token,
      user: data.user || null,
    }
  } catch {
    return null
  }
}

async function readClipboardAuth() {
  try {
    const raw = await Clipboard.getStringAsync()
    return parseClipboardAuth(raw)
  } catch {
    return null
  }
}

async function clearClipboardAuth() {
  try {
    const raw = await Clipboard.getStringAsync()
    if (raw?.startsWith(CLIP_PREFIX)) await Clipboard.setStringAsync('')
  } catch {
    /* ignore */
  }
}

async function waitForClipboardAuth(timeoutMs = AUTH_TIMEOUT_MS) {
  const started = Date.now()
  let resolveAuth
  const authPromise = new Promise((resolve) => {
    resolveAuth = resolve
  })

  const tryRead = async () => {
    const handoff = await readClipboardAuth()
    if (handoff) resolveAuth(handoff)
  }

  const interval = setInterval(() => {
    tryRead()
  }, 700)

  const appSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') tryRead()
  })

  tryRead()

  const timeout = sleep(timeoutMs).then(() => null)
  const handoff = await Promise.race([authPromise, timeout])
  clearInterval(interval)
  appSub.remove()
  if (!handoff) throw new Error('Tiempo de espera agotado. Vuelve a intentarlo.')
  return handoff
}

async function fetchMe(accessToken) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  return res.json()
}

function networkHelpMessage(errMsg) {
  if (/network request failed|failed to fetch|network error/i.test(String(errMsg || ''))) {
    return `No se pudo alcanzar el API:\n${API_URL}\n\nComprueba la conexión o reinicia Expo tras cambiar .env (npx expo start -c).`
  }
  if (/tiempo de espera|timeout/i.test(String(errMsg || ''))) {
    return 'No llegó la sesión desde el navegador. En la web pulsa “Enviar sesión a la app” y vuelve a Expo Go.'
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
    try {
      await clearClipboardAuth()
      const authUrl = `${webBase}/mobile-auth`
      // openBrowserAsync blocks until dismiss; race clipboard handoff in parallel.
      const handoffPromise = waitForClipboardAuth(AUTH_TIMEOUT_MS)
      const browserPromise = WebBrowser.openBrowserAsync(authUrl)

      let handoff
      try {
        handoff = await handoffPromise
      } catch (e) {
        try {
          await WebBrowser.dismissBrowser()
        } catch {
          /* ignore */
        }
        await browserPromise.catch(() => {})
        throw e
      }

      try {
        await WebBrowser.dismissBrowser()
      } catch {
        /* ignore */
      }
      await browserPromise.catch(() => {})
      await clearClipboardAuth()

      const user = handoff.user || (await fetchMe(handoff.access_token))
      if (!user) throw new Error(t('landing.loginFailed'))
      await setSession(handoff.access_token, user)
      if (typeof refreshSession === 'function') await refreshSession()
      router.replace('/dashboard')
    } catch (e) {
      Alert.alert('Error', networkHelpMessage(e.message) || e.message || t('landing.loginFailed'))
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
              {isExpoGo ? 'Expo Go' : 'Dev build'} · login Google vía web
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

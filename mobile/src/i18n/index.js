import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import es from './locales/es.json'
import en from './locales/en.json'
import pt from './locales/pt.json'

const LANG_KEY = 'profipaws_lang'

const resources = {
  es: { translation: es },
  en: { translation: en },
  pt: { translation: pt },
}

export async function initI18n() {
  const stored = await AsyncStorage.getItem(LANG_KEY)
  const lng = stored === 'en' || stored === 'pt' || stored === 'es' ? stored : 'es'

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'es',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    })
  } else if (i18n.language !== lng) {
    await i18n.changeLanguage(lng)
  }

  return i18n
}

export async function setAppLanguage(lng) {
  await AsyncStorage.setItem(LANG_KEY, lng)
  await i18n.changeLanguage(lng)
}

export function cycleLanguage(current) {
  const order = ['es', 'en', 'pt']
  const idx = order.indexOf(current)
  return order[(idx + 1) % order.length]
}

export default i18n

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import es from './locales/es.json'
import en from './locales/en.json'
import pt from './locales/pt.json'

const SUPPORTED = ['es', 'en', 'pt']

function resolveLang(lng) {
  const code = (lng || 'es').toLowerCase()
  if (code.startsWith('pt')) return 'pt'
  if (code.startsWith('en')) return 'en'
  return 'es'
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      pt: { translation: pt },
    },
    fallbackLng: 'es',
    supportedLngs: SUPPORTED,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'profipaws_lang',
    },
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = resolveLang(lng)
})
document.documentElement.lang = resolveLang(i18n.language)

export default i18n

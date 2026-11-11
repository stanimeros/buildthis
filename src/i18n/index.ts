import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import elCommon from './locales/el/common.json'
import enCommon from './locales/en/common.json'

export const languages = ['en', 'el'] as const
export type Language = (typeof languages)[number]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      el: { common: elCommon },
    },
    fallbackLng: 'en',
    supportedLngs: languages,
    nonExplicitSupportedLngs: true,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lang',
    },
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})
document.documentElement.lang = i18n.resolvedLanguage ?? 'en'

export function currentLanguage(): Language {
  return i18n.resolvedLanguage === 'el' ? 'el' : 'en'
}

export default i18n

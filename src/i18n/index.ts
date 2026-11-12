import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import elCommon from './locales/el/common.json'
import enCommon from './locales/en/common.json'

export const languages = ['en', 'el'] as const
export type Language = (typeof languages)[number]

const STORAGE_KEY = 'lang'

// Pages are pre-rendered in English. Every island starts in English too, so hydration matches
// the HTML, and `useDetectedLanguage` switches to the visitor's language right after.
i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    el: { common: elCommon },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: languages,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

function detect(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'el') return saved
  } catch {
    // ignore
  }
  return navigator.languages?.some((l) => l.toLowerCase().startsWith('el')) ? 'el' : 'en'
}

export function setLanguage(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // ignore
  }
  return i18n.changeLanguage(lang)
}

let detected = false
/** Call from an island's effect (after hydration). Only the first call does anything. */
export function applyDetectedLanguage() {
  if (detected) return
  detected = true
  i18n.changeLanguage(detect())
}

if (typeof document !== 'undefined') {
  const syncHtmlLang = () => {
    document.documentElement.lang = i18n.resolvedLanguage ?? 'en'
  }
  i18n.on('languageChanged', syncHtmlLang)
  // <ClientRouter /> swaps <html> attributes on navigation; put ours back.
  document.addEventListener('astro:after-swap', syncHtmlLang)
}

export function currentLanguage(): Language {
  return i18n.resolvedLanguage === 'el' ? 'el' : 'en'
}

export default i18n

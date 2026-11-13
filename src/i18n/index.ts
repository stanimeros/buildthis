import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import elCommon from './locales/el/common.json'
import enCommon from './locales/en/common.json'

export const languages = ['en', 'el'] as const
export type Language = (typeof languages)[number]

const STORAGE_KEY = 'lang'

/** English lives at `/`, Greek under `/el`. */
export function langFromPath(path: string): Language {
  return /^\/el(?=[/?#]|$)/.test(path) ? 'el' : 'en'
}

/** The same in-app path in `lang`, e.g. ("/p/abc", "el") → "/el/p/abc". Leaves other URLs alone. */
export function localizePath(path: string, lang: Language) {
  if (!path.startsWith('/') || path.startsWith('//')) return path
  const bare = path.replace(/^\/el(?=[/?#]|$)/, '') || '/'
  if (lang === 'en') return bare
  return /^\/(?:[?#]|$)/.test(bare) ? `/el${bare.slice(1)}` : `/el${bare}`
}

/** One page per language: `[...lang]` is undefined for English and "el" for Greek. */
export function getStaticPaths() {
  return [{ params: { lang: undefined } }, { params: { lang: 'el' } }]
}

// Every page is pre-rendered in its own language, so the language comes from the URL.
i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    el: { common: elCommon },
  },
  lng: typeof location === 'undefined' ? 'en' : langFromPath(location.pathname),
  fallbackLng: 'en',
  supportedLngs: languages,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

/** Remembered for the next visit (see the redirect in layouts/base.astro). */
export function saveLanguage(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // ignore
  }
}

if (typeof document !== 'undefined') {
  // <ClientRouter /> navigations can cross languages (the switcher, or the 404 page).
  document.addEventListener('astro:after-swap', () => i18n.changeLanguage(langFromPath(location.pathname)))
  // The 404 page is shared by both languages and pre-rendered in English.
  i18n.on('languageChanged', (lng) => (document.documentElement.lang = lng))
}

export function currentLanguage(): Language {
  return i18n.resolvedLanguage === 'el' ? 'el' : 'en'
}

export default i18n

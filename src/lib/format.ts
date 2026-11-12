import type { Timestamp } from 'firebase/firestore'
import i18n from 'i18next'

import { currentLanguage } from '@/i18n'

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function timeAgo(ts: Timestamp | null | undefined) {
  const rtf = new Intl.RelativeTimeFormat(currentLanguage(), { numeric: 'auto' })
  if (!ts) return rtf.format(0, 'second')
  const seconds = (ts.toMillis() - Date.now()) / 1000
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, 'minute')
}

export function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Deleted accounts are stored as "Deleted user" (the rules check that exact text); show it translated. */
export function authorLabel(name: string) {
  return name === 'Deleted user' ? i18n.t('common.deletedUser') : name
}

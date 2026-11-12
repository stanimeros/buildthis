import type { Timestamp } from 'firebase/firestore'

import type { Profile } from '@/lib/types'

// Mirrors the anti-abuse limits in firestore.rules, so the UI can explain a refusal before sending.
export const LIMITS = {
  issueCooldownMin: 10,
  solutionCooldownMin: 2,
  issuesPerDay: 5,
  solutionsPerDay: 3,
  /** minutes between "I'm building this" and submitting a solution */
  claimWaitMin: 60,
} as const

/** UTC day key, e.g. 20261112. Same formula as todayKey() in the rules. */
export function dayKey(date = new Date()) {
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate()
}

export function inCooldown(last: Timestamp | undefined, minutes: number) {
  return !!last && Date.now() - last.toMillis() < minutes * 60_000
}

type Daily = 'issues' | 'solutions'

/** How many were used today. */
export function usedToday(profile: Profile, kind: Daily) {
  return profile[`${kind}Day`] === dayKey() ? (profile[`${kind}Today`] ?? 0) : 0
}

/** Field values for the user doc, written in the same batch as the create. */
export function bumpDaily(profile: Profile, kind: Daily) {
  return { [`${kind}Day`]: dayKey(), [`${kind}Today`]: usedToday(profile, kind) + 1 }
}

/** Milliseconds until a claim made at `claimedAt` allows submitting (0 = now). */
export function claimWaitLeft(claimedAt: Timestamp | null | undefined) {
  if (!claimedAt) return Infinity
  return Math.max(0, claimedAt.toMillis() + LIMITS.claimWaitMin * 60_000 - Date.now())
}

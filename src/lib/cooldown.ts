import type { Timestamp } from 'firebase/firestore'

/** Mirrors the cooldowns in firestore.rules so we can explain a refusal before sending it. */
export function inCooldown(last: Timestamp | undefined, minutes: number) {
  return !!last && Date.now() - last.toMillis() < minutes * 60_000
}

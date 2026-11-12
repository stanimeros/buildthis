// Open/close state of the sign-in + onboarding dialog, shared by every island (module-level store,
// like src/lib/auth.tsx). The dialog itself lives in the persistent header island.
import { useSyncExternalStore } from 'react'

let open = false
/** where to go once sign-in + onboarding finish (e.g. "/new" from a "Post a problem" button) */
let next: string | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Usable directly as an onClick handler; pass a path to continue there after signing in. */
export function openAuthDialog(then?: unknown) {
  open = true
  next = typeof then === 'string' ? then : null
  emit()
}

export function closeAuthDialog() {
  open = false
  next = null
  emit()
}

/** Close after a successful sign-in and hand back where to continue. */
export function finishAuthDialog() {
  const then = next
  open = false
  next = null
  emit()
  return then
}

export function useAuthDialogOpen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => open,
    () => false,
  )
}

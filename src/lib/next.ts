/** Safe in-app redirect target from a `?next=` param (no external URLs). */
export function safeNext(raw: string | null, fallback = '/') {
  if (!raw || typeof location === 'undefined') return fallback
  // Resolve like the browser would ("/\t/evil.com" → //evil.com) and keep it only if same-origin.
  try {
    const url = new URL(raw, location.origin)
    return url.origin === location.origin ? url.pathname + url.search + url.hash : fallback
  } catch {
    return fallback
  }
}

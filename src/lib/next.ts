/** Safe in-app redirect target from a `?next=` param (no external URLs). */
export function safeNext(raw: string | null, fallback = '/') {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}

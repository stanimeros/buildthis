// Remembers which social post brought the visitor (utm_source, else referrer host).
const KEY = 'source'

export function captureSource() {
  try {
    if (localStorage.getItem(KEY)) return
    const utm = new URLSearchParams(location.search).get('utm_source')
    const ref = document.referrer ? new URL(document.referrer).host : ''
    const source = utm || (ref && ref !== location.host ? ref : 'direct')
    localStorage.setItem(KEY, source.slice(0, 200))
  } catch {
    // storage blocked: fall back to 'direct' at read time
  }
}

export function getSource(): string {
  try {
    return localStorage.getItem(KEY) ?? 'direct'
  } catch {
    return 'direct'
  }
}

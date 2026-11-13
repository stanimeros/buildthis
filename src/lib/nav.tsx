// Tiny router-shaped helpers for Astro islands. Pages are real Astro pages; navigation goes
// through Astro's <ClientRouter /> (view transitions), so links are plain <a href>.
// Paths are written without the language prefix ("/new"); these helpers add "/el" on Greek pages.
import { type AnchorHTMLAttributes, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/spinner'
import { type Language, langFromPath, localizePath } from '@/i18n'

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', emit)
  document.addEventListener('astro:after-swap', emit)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** `lang` switches language; otherwise it stays the current page's. */
export function navigate(to: string, opts: { replace?: boolean; lang?: Language } = {}) {
  const href = localizePath(to, opts.lang ?? langFromPath(location.pathname))
  import('astro:transitions/client').then(({ navigate: go }) =>
    go(href, { history: opts.replace ? 'replace' : 'auto' }),
  )
}

export function useNavigate() {
  return navigate
}

export function useLocation() {
  const pathname = useSyncExternalStore(subscribe, () => location.pathname, () => '')
  const search = useSyncExternalStore(subscribe, () => location.search, () => '')
  return { pathname, search }
}

/** `[/el]/p/:id[/edit|/submit]` → { id } */
export function useParams(): { id?: string } {
  const { pathname } = useLocation()
  const match = pathname.match(/^(?:\/el)?\/p\/([^/]+)/)
  return { id: match ? decodeURIComponent(match[1]) : undefined }
}

export function useSearchParams() {
  const { search } = useLocation()
  const params = useMemo(() => new URLSearchParams(search), [search])
  function set(next: URLSearchParams) {
    const qs = next.toString()
    history.replaceState(history.state, '', qs ? `?${qs}` : location.pathname)
    emit()
  }
  return [params, set] as const
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string }

export function Link({ to, ...props }: LinkProps) {
  const { i18n } = useTranslation()
  return <a href={localizePath(to, i18n.language === 'el' ? 'el' : 'en')} {...props} />
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  useEffect(() => navigate(to, { replace }), [to, replace])
  return <Spinner />
}

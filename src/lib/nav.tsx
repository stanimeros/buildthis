// Tiny router-shaped helpers for Astro islands. Pages are real Astro pages; navigation goes
// through Astro's <ClientRouter /> (view transitions), so links are plain <a href>.
import { type AnchorHTMLAttributes, useEffect, useMemo, useSyncExternalStore } from 'react'

import { Spinner } from '@/components/spinner'

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

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  import('astro:transitions/client').then(({ navigate: go }) =>
    go(to, { history: opts.replace ? 'replace' : 'auto' }),
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

/** `/p/:id[/edit|/submit]` → { id } */
export function useParams(): { id?: string } {
  const { pathname } = useLocation()
  const match = pathname.match(/^\/p\/([^/]+)/)
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
  return <a href={to} {...props} />
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  useEffect(() => navigate(to, { replace }), [to, replace])
  return <Spinner />
}

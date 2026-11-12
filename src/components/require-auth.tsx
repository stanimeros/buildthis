import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from '@/lib/nav'

import { Spinner } from '@/components/spinner'
import { useAuth } from '@/lib/auth'

function here(loc: { pathname: string; search: string }) {
  return encodeURIComponent(loc.pathname + loc.search)
}

/** Returns a function that sends the visitor to sign in, then back here. */
export function useRequireSignIn() {
  const navigate = useNavigate()
  const loc = useLocation()
  return () => navigate(`/signin?next=${here(loc)}`)
}

/** Gate for pages that need a signed-in, onboarded user. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/signin?next=${here(loc)}`} replace />
  if (!profile) return <Navigate to={`/onboarding?next=${here(loc)}`} replace />
  return children
}

import type { ReactNode } from 'react'

import { SignInPrompt } from '@/components/auth-dialog'
import { Spinner } from '@/components/spinner'
import { useAuth } from '@/lib/auth'
import { openAuthDialog } from '@/lib/auth-dialog'

/** Returns a function that asks the visitor to sign in (dialog on the same page). */
export function useRequireSignIn() {
  return openAuthDialog
}

/** Gate for pages that need a signed-in, onboarded user. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user || !profile) return <SignInPrompt />
  return children
}

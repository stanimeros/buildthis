import { GoogleLogoIcon, LockKeyIcon } from '@phosphor-icons/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Logo } from '@/components/logo'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { justSignedOut, signInWithGoogle, useAuth } from '@/lib/auth'
import { closeAuthDialog, finishAuthDialog, openAuthDialog, useAuthDialogOpen } from '@/lib/auth-dialog'
import { Link, navigate } from '@/lib/nav'

// Only new users see it, so it loads when the dialog first needs it.
const OnboardingForm = lazy(() => import('@/views/onboarding').then((m) => ({ default: m.OnboardingForm })))

function SignInStep() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  async function google() {
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        console.error(err)
        toast.error(`${t('signin.error')}${code ? ` (${code})` : ''}`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center">
      <Logo />
      <div>
        <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight">{t('signin.title')}</DialogTitle>
        <DialogDescription className="mt-2">{t('signin.subtitle')}</DialogDescription>
      </div>
      <Button size="lg" variant="flame" className="w-full" onClick={google} loading={busy}>
        <GoogleLogoIcon weight="bold" />
        {t('signin.google')}
      </Button>
      <p className="text-xs text-muted-foreground">{t('signin.terms')}</p>
    </div>
  )
}

/**
 * Sign in with Google, then onboarding, without leaving the page. Opened by openAuthDialog()
 * from anywhere; closes by itself once the user has a profile.
 */
export function AuthDialog() {
  const { t } = useTranslation()
  const open = useAuthDialogOpen()
  const { user, profile, loading } = useAuth()
  const [early, setEarly] = useState<string | null>(null)

  // Pick up an <AuthLink> clicked before its island hydrated (see layouts/base.astro).
  useEffect(() => {
    const take = () => {
      const to = window.__pendingAuthLink
      window.__pendingAuthLink = undefined
      if (to) setEarly(to)
    }
    take()
    window.addEventListener('buildthis:auth-link', take)
    return () => window.removeEventListener('buildthis:auth-link', take)
  }, [])

  // Then do what the link would have done, once we know who's signed in.
  useEffect(() => {
    if (!early || loading) return
    setEarly(null)
    if (user && profile) navigate(early)
    else openAuthDialog(early)
  }, [early, loading, user, profile])

  useEffect(() => {
    if (!open || !user || !profile) return
    const then = finishAuthDialog()
    if (then && then !== location.pathname) navigate(then)
  }, [open, user, profile])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeAuthDialog()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto rounded-[2rem] p-6 ring-2 ring-ink sm:max-w-md sm:p-8">
        {!user ? (
          <SignInStep />
        ) : loading ? (
          <>
            <DialogTitle className="sr-only">{t('common.loading')}</DialogTitle>
            <Spinner />
          </>
        ) : (
          <>
            <DialogTitle className="sr-only">{t('signin.title')}</DialogTitle>
            <Suspense fallback={<Spinner />}>
              <OnboardingForm />
            </Suspense>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** In-page placeholder for pages that need an account; opens the dialog right away. */
export function SignInPrompt() {
  const { t } = useTranslation()
  useEffect(() => {
    if (!justSignedOut()) openAuthDialog()
  }, [])
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-lime">
        <LockKeyIcon weight="duotone" className="size-7" />
      </div>
      <p className="font-heading text-xl font-bold">{t('signin.prompt')}</p>
      <Button size="lg" variant="flame" onClick={openAuthDialog}>
        {t('nav.signIn')}
      </Button>
    </div>
  )
}

/**
 * A link to a page that needs an account (/new, /me…). Signed out, it opens the sign-in dialog on
 * the current page instead, and continues to the link once signed in and onboarded.
 */
export function AuthLink({ to, onClick, ...props }: React.ComponentProps<typeof Link>) {
  const { user, profile } = useAuth()
  return (
    <Link
      to={to}
      data-auth-link
      onClick={(e) => {
        onClick?.(e)
        if (user && profile) return
        e.preventDefault()
        openAuthDialog(to)
      }}
      {...props}
    />
  )
}

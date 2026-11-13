import { EnvelopeSimpleIcon, GoogleLogoIcon, LockKeyIcon } from '@phosphor-icons/react'
import { type FormEvent, lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Logo } from '@/components/logo'
import { Spinner } from '@/components/spinner'
import { Field } from '@/components/field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  checkVerified, justSignedOut, resendVerification, resetPassword, signInWithEmail, signInWithGoogle,
  signOut, signUpWithEmail, useAuth,
} from '@/lib/auth'
import { langFromPath, localizePath } from '@/i18n'
import { closeAuthDialog, finishAuthDialog, openAuthDialog, useAuthDialogOpen } from '@/lib/auth-dialog'
import { Link, navigate } from '@/lib/nav'

// Only new users see it, so it loads when the dialog first needs it.
const OnboardingForm = lazy(() => import('@/views/onboarding').then((m) => ({ default: m.OnboardingForm })))

const PASSWORD_MIN = 8

/** Firebase error codes we can explain; anything else gets the generic message. */
const authErrors: Record<string, string> = {
  'auth/invalid-credential': 'signin.wrongPassword',
  'auth/wrong-password': 'signin.wrongPassword',
  'auth/user-not-found': 'signin.wrongPassword',
  'auth/invalid-email': 'signin.invalidEmail',
  'auth/email-already-in-use': 'signin.emailInUse',
  'auth/weak-password': 'signin.weakPassword',
  'auth/too-many-requests': 'signin.tooMany',
}

function errorCode(err: unknown) {
  return (err as { code?: string }).code ?? ''
}

function EmailForm() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const signup = mode === 'signup'
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim())
  const passwordOk = signup ? password.length >= PASSWORD_MIN : password.length > 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!emailOk || !passwordOk) return
    setBusy(true)
    setError(null)
    try {
      if (signup) await signUpWithEmail(email.trim(), password)
      else await signInWithEmail(email.trim(), password)
    } catch (err) {
      const key = authErrors[errorCode(err)]
      if (!key) console.error(err)
      setError(t(key ?? 'signin.error'))
    } finally {
      setBusy(false)
    }
  }

  async function forgot() {
    if (!emailOk) {
      setError(t('signin.emailFirst'))
      return
    }
    setError(null)
    try {
      await resetPassword(email.trim())
    } catch (err) {
      // Don't reveal whether the address has an account.
      if (errorCode(err) !== 'auth/user-not-found') console.error(err)
    }
    toast.success(t('signin.resetSent', { email: email.trim() }))
  }

  return (
    <form onSubmit={submit} noValidate className="w-full space-y-4 text-left">
      <Field id="email" label={t('signin.email')}>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field id="password" label={t('signin.password')} hint={signup ? t('signin.passwordHint', { n: PASSWORD_MIN }) : undefined}>
        <Input
          id="password"
          type="password"
          autoComplete={signup ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!emailOk || !passwordOk}>
        {t(signup ? 'signin.signUp' : 'signin.signIn')}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          onClick={() => {
            setMode(signup ? 'signin' : 'signup')
            setError(null)
          }}
        >
          {t(signup ? 'signin.haveAccount' : 'signin.noAccount')}
        </Button>
        {!signup && (
          <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground" onClick={forgot}>
            {t('signin.forgot')}
          </Button>
        )}
      </div>
    </form>
  )
}

function SignInStep() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  // Google is the main way in; email + password opens on request.
  const [withEmail, setWithEmail] = useState(false)

  async function google() {
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      const code = errorCode(err)
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
      <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('signin.or')}
        <span className="h-px flex-1 bg-border" />
      </div>
      {withEmail ? (
        <EmailForm />
      ) : (
        <Button size="lg" variant="outline" className="w-full" onClick={() => setWithEmail(true)}>
          <EnvelopeSimpleIcon weight="bold" />
          {t('signin.withEmail')}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">{t('signin.terms')}</p>
    </div>
  )
}

/** Signed up with email: nothing works until the link in the email is opened. */
function VerifyStep({ email }: { email: string }) {
  const { t } = useTranslation()
  const [checking, setChecking] = useState(false)
  const [sending, setSending] = useState(false)

  // Notice by itself once the link was opened (in another tab or on the phone).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') checkVerified().catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  }, [])

  async function check() {
    setChecking(true)
    try {
      if (!(await checkVerified())) toast.error(t('signin.notVerified'))
    } catch (err) {
      console.error(err)
      toast.error(t('signin.error'))
    } finally {
      setChecking(false)
    }
  }

  async function resend() {
    setSending(true)
    try {
      await resendVerification()
      toast.success(t('signin.verifySent'))
    } catch (err) {
      toast.error(t(authErrors[errorCode(err)] ?? 'signin.error'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-lime">
        <EnvelopeSimpleIcon weight="duotone" className="size-7" />
      </div>
      <div>
        <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight">{t('signin.verifyTitle')}</DialogTitle>
        <DialogDescription className="mt-2">{t('signin.verifyBody', { email })}</DialogDescription>
      </div>
      <Button size="lg" variant="flame" className="w-full" onClick={check} loading={checking}>
        {t('signin.verifyDone')}
      </Button>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
        <Button variant="link" className="h-auto p-0" onClick={resend} disabled={sending}>
          {t('signin.verifyResend')}
        </Button>
        <Button variant="link" className="h-auto p-0 text-muted-foreground" onClick={() => signOut()}>
          {t('signin.otherAccount')}
        </Button>
      </div>
    </div>
  )
}

/**
 * Sign in (Google or email + password, verified), then onboarding, without leaving the page. Opened by openAuthDialog()
 * from anywhere; closes by itself once the user has a profile.
 */
export function AuthDialog() {
  const { t } = useTranslation()
  const open = useAuthDialogOpen()
  const { user, unverified, profile, loading } = useAuth()
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
    if (then && localizePath(then, langFromPath(location.pathname)) !== location.pathname) navigate(then)
  }, [open, user, profile])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeAuthDialog()}>
      {/* Full screen: the page behind is replaced while signing up. */}
      <DialogContent className="inset-0 top-0 left-0 block h-dvh w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none bg-background p-0 ring-0 sm:max-w-none [&>button]:fixed [&>button]:top-4 [&>button]:right-4 [&>button]:z-10 [&>button]:size-10">
        <div className="bg-dots pointer-events-none fixed inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
          {unverified ? (
            <VerifyStep email={unverified.email ?? ''} />
          ) : !user ? (
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
        </div>
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

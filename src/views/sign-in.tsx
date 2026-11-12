import { GoogleLogoIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { FormCard } from '@/components/field'
import { Page } from '@/components/layout'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { signInWithGoogle, useAuth } from '@/lib/auth'
import { Navigate, useSearchParams } from '@/lib/nav'
import { safeNext } from '@/lib/next'

export function SignInPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const { user, profile, loading } = useAuth()
  const [busy, setBusy] = useState(false)

  if (loading) return <Spinner />
  if (user) {
    return <Navigate to={profile ? next : `/onboarding?next=${encodeURIComponent(next)}`} replace />
  }

  async function google() {
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        console.error(err)
        toast.error(t('signin.error'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page narrow title={t('signin.title')} subtitle={t('signin.subtitle')}>
      <FormCard>
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          <Button size="lg" variant="flame" className="w-full" onClick={google} disabled={busy}>
            <GoogleLogoIcon weight="bold" />
            {t('signin.google')}
          </Button>
        </motion.div>
        <p className="mt-4 text-center text-xs text-muted-foreground">{t('signin.terms')}</p>
      </FormCard>
    </Page>
  )
}

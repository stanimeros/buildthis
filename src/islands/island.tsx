import '@/i18n'

import { LazyMotion, MotionConfig } from 'motion/react'
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'

import { Spinner } from '@/components/spinner'
import i18n, { applyDetectedLanguage } from '@/i18n'

// Lazy so islands without `auth` (footer, home) don't wait for Firebase to hydrate.
const RequireAuth = lazy(() => import('@/components/require-auth').then((m) => ({ default: m.RequireAuth })))
// Animation code loads after the first render; `m.*` components render their initial state until then.
const motionFeatures = () => import('@/lib/motion-features').then((m) => m.default)

/**
 * Shared wrapper for every React island.
 *
 * Each island gets its own i18n instance. Pre-rendered (`ssr`) islands start in English so
 * hydration matches the static HTML, then follow the global language right after mounting.
 */
export function Island({ children, auth, ssr }: { children: ReactNode; auth?: boolean; ssr?: boolean }) {
  const [instance] = useState(() => i18n.cloneInstance({ lng: ssr ? 'en' : i18n.language }))

  useEffect(() => {
    const follow = (lng: string) => {
      if (instance.language !== lng) instance.changeLanguage(lng)
    }
    applyDetectedLanguage()
    follow(i18n.language)
    i18n.on('languageChanged', follow)
    return () => i18n.off('languageChanged', follow)
  }, [instance])

  return (
    <I18nextProvider i18n={instance}>
      <LazyMotion features={motionFeatures}>
        <MotionConfig reducedMotion="user">
          {auth ? (
            <Suspense fallback={<Spinner />}>
              <RequireAuth>{children}</RequireAuth>
            </Suspense>
          ) : (
            children
          )}
        </MotionConfig>
      </LazyMotion>
    </I18nextProvider>
  )
}

import '@/i18n'

import { MotionConfig } from 'motion/react'
import { type ReactNode, useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'

import { RequireAuth } from '@/components/require-auth'
import i18n, { applyDetectedLanguage } from '@/i18n'

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
      <MotionConfig reducedMotion="user">{auth ? <RequireAuth>{children}</RequireAuth> : children}</MotionConfig>
    </I18nextProvider>
  )
}

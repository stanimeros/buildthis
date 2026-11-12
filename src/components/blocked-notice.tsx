import { ProhibitIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

/** Shown instead of forms to users blocked by strikes (see firestore.rules → moderation). */
export function BlockedNotice() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto mt-12 flex max-w-xl items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 p-6">
      <ProhibitIcon weight="duotone" className="mt-0.5 size-6 shrink-0 text-destructive" />
      <div>
        <p className="font-heading text-lg font-bold">{t('blocked.title')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('blocked.body')}</p>
      </div>
    </div>
  )
}

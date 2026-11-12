import { ArrowClockwiseIcon, type Icon, WarningCircleIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const tones = {
  empty: { box: 'border-dashed border-ink/15 bg-muted/50', tile: 'bg-lime text-ink' },
  missing: { box: 'border-transparent bg-muted/50', tile: 'bg-primary/10 text-primary' },
  error: { box: 'border-destructive/30 bg-destructive/5', tile: 'bg-destructive/10 text-destructive' },
}

/** Empty, not-found and error states: a colored icon tile, a message and an optional action. */
export function EmptyState({
  icon: Icon,
  tone = 'empty',
  title,
  body,
  children,
  className,
}: {
  icon: Icon
  tone?: keyof typeof tones
  title: string
  body?: string
  /** action button(s) */
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn('flex flex-col items-center gap-4 rounded-3xl border px-6 py-12 text-center', tones[tone].box, className)}
    >
      <div className={cn('flex size-14 items-center justify-center rounded-2xl', tones[tone].tile)}>
        <Icon weight="duotone" className="size-7" />
      </div>
      <div className="max-w-sm">
        <p className="font-heading text-lg font-bold">{title}</p>
        {body && <p className="mt-1 text-sm text-pretty text-muted-foreground">{body}</p>}
      </div>
      {children}
    </div>
  )
}

/** Error state for a list that failed to load. */
export function LoadError() {
  const { t } = useTranslation()
  return (
    <EmptyState icon={WarningCircleIcon} tone="error" title={t('common.error')} body={t('common.errorBody')}>
      <Button variant="outline" onClick={() => location.reload()}>
        <ArrowClockwiseIcon weight="bold" />
        {t('common.retry')}
      </Button>
    </EmptyState>
  )
}

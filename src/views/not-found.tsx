import { MapTrifoldIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Link } from '@/lib/nav'

import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-heading text-8xl font-black text-primary">404</p>
      <EmptyState icon={MapTrifoldIcon} tone="missing" title={t('common.notFound')} className="py-8">
        <Button asChild>
          <Link to="/">{t('common.home')}</Link>
        </Button>
      </EmptyState>
    </div>
  )
}

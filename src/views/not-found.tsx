import { useTranslation } from 'react-i18next'
import { Link } from '@/lib/nav'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-heading text-8xl font-black text-primary">404</p>
      <p className="mt-4 text-lg text-muted-foreground">{t('common.notFound')}</p>
      <Button className="mt-8" asChild>
        <Link to="/">{t('common.home')}</Link>
      </Button>
    </div>
  )
}

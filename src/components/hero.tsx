import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SignupType } from '@/components/signup-form'

export function Hero({ onPick }: { onPick: (type: SignupType) => void }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto max-w-3xl px-4 pt-20 pb-16 text-center sm:pt-28">
      <Badge variant="secondary" className="mb-6">
        {t('hero.badge')}
      </Badge>
      <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-6xl">
        {t('hero.title')}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">
        {t('hero.subtitle')}
      </p>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <Button size="lg" onClick={() => onPick('problem')}>
          {t('hero.ctaProblem')}
        </Button>
        <Button size="lg" variant="outline" onClick={() => onPick('builder')}>
          {t('hero.ctaBuilder')}
        </Button>
      </div>
    </section>
  )
}

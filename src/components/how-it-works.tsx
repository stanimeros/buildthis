import { Hammer, MessageSquarePlus, ThumbsUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const steps = [
  { icon: MessageSquarePlus, key: 'step1' },
  { icon: ThumbsUp, key: 'step2' },
  { icon: Hammer, key: 'step3' },
] as const

export function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        {t('how.title')}
      </h2>
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {steps.map(({ icon: Icon, key }, i) => (
          <div key={key} className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <h3 className="mt-4 font-medium">
              {i + 1}. {t(`how.${key}Title`)}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{t(`how.${key}Body`)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

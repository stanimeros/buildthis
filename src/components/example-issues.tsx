import { ChevronUp, Hammer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

// Static seed issues for the validation landing (no Firestore reads yet).
const examples = [
  { id: '1', votes: 128, builders: 4 },
  { id: '2', votes: 97, builders: 2 },
  { id: '3', votes: 84, builders: 3 },
  { id: '4', votes: 61, builders: 1 },
  { id: '5', votes: 45, builders: 2 },
] as const

export function ExampleIssues() {
  const { t } = useTranslation()

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        {t('examples.title')}
      </h2>
      <p className="mt-2 text-center text-muted-foreground">{t('examples.subtitle')}</p>
      <ul className="mt-10 space-y-3">
        {examples.map(({ id, votes, builders }) => (
          <li key={id}>
            <Card className="flex-row items-center gap-4 p-4">
              <div
                className="flex w-14 shrink-0 flex-col items-center rounded-md border py-1 text-sm font-medium"
                aria-label={t('examples.votes', { count: votes })}
              >
                <ChevronUp className="size-4" />
                {votes}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t(`examples.items.${id}.title`)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{t(`examples.items.${id}.category`)}</Badge>
                  <span className="inline-flex items-center gap-1">
                    <Hammer className="size-3" />
                    {t('examples.builders', { count: builders })}
                  </span>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

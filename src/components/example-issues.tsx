import { HammerIcon } from '@phosphor-icons/react'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'

// Shown on the home page only while nobody has posted a real issue yet.
const examples = [
  { id: '1', votes: 128, builders: 4 },
  { id: '2', votes: 97, builders: 2 },
  { id: '3', votes: 84, builders: 3 },
] as const

export function ExampleIssues() {
  const { t } = useTranslation()

  return (
    <div>
      <p className="mb-4 text-center text-sm font-semibold text-muted-foreground">{t('examples.subtitle')}</p>
      <ul className="space-y-3 opacity-80">
        {examples.map(({ id, votes, builders }, i) => (
          <m.li
            key={id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-4 rounded-3xl border border-dashed bg-card p-3 pr-5"
          >
            <div className="flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2 font-heading font-bold">
              {votes}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t(`examples.items.${id}.title`)}</p>
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="rounded-full bg-muted px-2.5 py-1">{t(`examples.items.${id}.category`)}</span>
                <span className="inline-flex items-center gap-1">
                  <HammerIcon weight="duotone" className="size-4" />
                  {t('count.builders', { count: builders })}
                </span>
              </div>
            </div>
          </m.li>
        ))}
      </ul>
    </div>
  )
}

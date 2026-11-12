import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/avatar'
import { useCommunity, useStats } from '@/lib/hooks'

/** Member counts plus avatars of builders who chose to be shown here. Hidden while there's nothing to show. */
export function Community() {
  const { t } = useTranslation()
  const { data } = useCommunity()
  const stats = useStats()
  if (!data.length && !stats?.users) return null

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}>
        <p className="text-sm font-bold tracking-widest text-primary uppercase">{t('community.kicker')}</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('community.title')}</h2>
        {!!stats?.users && (
          <p className="mt-3 text-lg text-muted-foreground">
            {t('community.counts', {
              users: t('community.users', { count: stats.users }),
              builders: t('community.builders', { count: stats.builders }),
            })}
          </p>
        )}
      </m.div>
      {data.length > 0 && (
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {data.map((member, i) => (
            <m.li
              key={member.id}
              title={member.name}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: Math.min(i * 0.02, 0.4) }}
            >
              <Avatar name={member.name} photo={member.photo} className="size-11 ring-2 ring-background text-base" />
              <span className="sr-only">{member.name}</span>
            </m.li>
          ))}
        </ul>
      )}
    </section>
  )
}

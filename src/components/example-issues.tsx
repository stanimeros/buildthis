import { ArrowFatUpIcon, HammerIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

// Static seed issues for the validation landing (no Firestore reads yet).
// Votes here are local only: they let visitors feel the mechanic, and the list re-sorts live.
const seed = [
  { id: '1', votes: 128, builders: 4 },
  { id: '2', votes: 97, builders: 2 },
  { id: '3', votes: 97, builders: 3 },
  { id: '4', votes: 61, builders: 1 },
  { id: '5', votes: 61, builders: 2 },
]

function VoteButton({ votes, voted, onClick, label }: { votes: number; voted: boolean; onClick: () => void; label: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={voted}
      aria-label={label}
      whileTap={{ scale: 0.85 }}
      className={cn(
        'flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-2xl border py-2 font-heading font-bold transition-colors',
        voted ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-ink/30',
      )}
    >
      <motion.span animate={voted ? { y: [0, -6, 0] } : { y: 0 }} transition={{ duration: 0.35 }}>
        <ArrowFatUpIcon weight={voted ? 'fill' : 'bold'} className="size-5" />
      </motion.span>
      <span className="relative h-5 overflow-hidden tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={votes}
            className="block"
            initial={{ y: voted ? 16 : -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: voted ? -16 : 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {votes}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  )
}

export function ExampleIssues() {
  const { t } = useTranslation()
  const [voted, setVoted] = useState<Record<string, boolean>>({})

  const items = seed
    .map((s) => ({ ...s, votes: s.votes + (voted[s.id] ? 1 : 0) }))
    .sort((a, b) => b.votes - a.votes)

  return (
    <section className="mx-auto max-w-3xl px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        className="text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{t('examples.title')}</h2>
        <p className="mt-3 text-lg text-muted-foreground">{t('examples.subtitle')}</p>
      </motion.div>

      <ul className="mt-12 space-y-3">
        {items.map(({ id, votes, builders }, i) => (
          <motion.li
            key={id}
            layout
            initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="flex items-center gap-4 rounded-3xl border bg-card p-3 pr-5 transition-shadow hover:shadow-[0_12px_30px_-16px_oklch(0.18_0.01_60/0.35)]"
          >
            <VoteButton
              votes={votes}
              voted={!!voted[id]}
              label={`${t('examples.tryVote')} · ${t('examples.votes', { count: votes })}`}
              onClick={() => setVoted((v) => ({ ...v, [id]: !v[id] }))}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug sm:text-lg">{t(`examples.items.${id}.title`)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="rounded-full bg-muted px-2.5 py-1">{t(`examples.items.${id}.category`)}</span>
                <span className="inline-flex items-center gap-1">
                  <HammerIcon weight="duotone" className="size-4" />
                  {t('examples.builders', { count: builders })}
                </span>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}

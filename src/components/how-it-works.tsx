import { ArrowFatUpIcon, ChatCircleDotsIcon, TrophyIcon } from '@phosphor-icons/react'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'

const steps = [
  { icon: ChatCircleDotsIcon, key: 'step1', tile: 'bg-sky', tilt: '-rotate-2' },
  { icon: ArrowFatUpIcon, key: 'step2', tile: 'bg-lime', tilt: 'rotate-1' },
  { icon: TrophyIcon, key: 'step3', tile: 'bg-primary text-primary-foreground', tilt: '-rotate-1' },
] as const

export function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        className="text-center"
      >
        <p className="text-sm font-bold tracking-widest text-primary uppercase">{t('how.title')}</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{t('how.kicker')}</h2>
      </m.div>

      <div className="mt-14 grid gap-5 sm:grid-cols-3">
        {steps.map(({ icon: Icon, key, tile, tilt }, i) => (
          <m.div
            key={key}
            initial={{ opacity: 0, y: 40, rotate: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6, rotate: i === 1 ? 1 : -1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 160, damping: 18, delay: i * 0.1 }}
            className="relative rounded-3xl border bg-card p-7 shadow-[0_1px_0_oklch(0.18_0.01_60/0.04)]"
          >
            <span className="absolute top-5 right-6 font-heading text-6xl font-black text-ink/[0.06]">
              0{i + 1}
            </span>
            <div className={`flex size-14 items-center justify-center rounded-2xl ${tile} ${tilt}`}>
              <Icon weight="duotone" className="size-7" />
            </div>
            <h3 className="mt-6 text-xl font-bold tracking-tight">{t(`how.${key}Title`)}</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(`how.${key}Body`)}</p>
          </m.div>
        ))}
      </div>
    </section>
  )
}

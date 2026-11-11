import { ArrowFatUpIcon, CursorIcon, HammerIcon, SparkleIcon } from '@phosphor-icons/react'
import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { SignupType } from '@/components/signup-form'
import { Button } from '@/components/ui/button'

const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 120, damping: 18 } },
}

function Highlight({ children }: { children?: ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <motion.span
        aria-hidden
        className="absolute inset-x-[-0.12em] bottom-[0.06em] top-[0.42em] -z-10 origin-left -rotate-1 rounded-md bg-lime"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.7, duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
      />
      {children}
    </span>
  )
}

// Little stickers floating around the headline — pure decoration.
function Floater({
  className,
  delay,
  children,
}: {
  className: string
  delay: number
  children: ReactNode
}) {
  return (
    <motion.div
      aria-hidden
      className={`absolute hidden lg:block ${className}`}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 14 }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export function Hero({ onPick }: { onPick: (type: SignupType) => void }) {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden">
      <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      <Floater className="top-28 left-[8%]" delay={1.1}>
        <div className="flex -rotate-6 items-center gap-2 rounded-2xl border bg-card px-3 py-2 text-sm font-bold shadow-lg">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ArrowFatUpIcon weight="fill" />
          </span>
          +128
        </div>
      </Floater>
      <Floater className="top-64 right-[7%]" delay={1.3}>
        <div className="flex rotate-3 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background shadow-lg">
          <HammerIcon weight="duotone" className="size-5 text-lime" />4 builders
        </div>
      </Floater>
      <Floater className="bottom-16 left-[14%]" delay={1.5}>
        <div className="flex items-start gap-1">
          <CursorIcon weight="fill" className="size-6 -rotate-12 text-primary" />
          <span className="mt-4 rounded-full rounded-tl-none bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            builder
          </span>
        </div>
      </Floater>
      <Floater className="top-36 right-[16%]" delay={1.7}>
        <SparkleIcon weight="fill" className="size-9 text-sky" />
      </Floater>

      <motion.div
        className="relative mx-auto max-w-4xl px-4 pt-20 pb-20 text-center sm:pt-28 sm:pb-28"
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.12, delayChildren: 0.15 }}
      >
        <motion.div variants={rise} className="inline-flex">
          <a
            href="#signup"
            className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {t('hero.badge')}
          </a>
        </motion.div>

        <motion.h1
          variants={rise}
          className="relative isolate mt-8 text-5xl leading-[0.95] font-extrabold tracking-[-0.04em] text-balance sm:text-7xl md:text-8xl"
        >
          <Trans i18nKey="hero.title" components={{ hl: <Highlight /> }} />
        </motion.h1>

        <motion.p
          variants={rise}
          className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl"
        >
          {t('hero.subtitle')}
        </motion.p>

        <motion.div variants={rise} className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}>
            <Button size="lg" variant="flame" className="w-full" onClick={() => onPick('problem')}>
              {t('hero.ctaProblem')}
            </Button>
          </motion.div>
          <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}>
            <Button size="lg" variant="outline" className="w-full" onClick={() => onPick('builder')}>
              <HammerIcon weight="duotone" />
              {t('hero.ctaBuilder')}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}

import { PlusIcon } from '@phosphor-icons/react'
import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Link } from '@/lib/nav'

const rise: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 120, damping: 18 } },
}

// A lime marker that wraps with the text (box-decoration-clone), so long phrases still fit on phones.
function Highlight({ children }: { children?: ReactNode }) {
  return (
    <motion.span
      className="box-decoration-clone bg-no-repeat px-[0.08em] [background-image:linear-gradient(var(--lime),var(--lime))] [background-position:0_88%]"
      initial={{ backgroundSize: '0% 52%' }}
      animate={{ backgroundSize: '100% 52%' }}
      transition={{ delay: 0.6, duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
    >
      {children}
    </motion.span>
  )
}

/** Compact pitch above the vote board. */
export function Hero() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden">
      <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <motion.div
        className="relative mx-auto max-w-3xl px-4 pt-14 pb-12 text-center sm:pt-20 sm:pb-16"
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
      >
        <motion.h1
          variants={rise}
          className="relative text-4xl leading-[0.95] font-extrabold tracking-[-0.04em] text-balance sm:text-6xl md:text-7xl"
        >
          <Trans i18nKey="hero.title" components={{ hl: <Highlight /> }} />
        </motion.h1>
        <motion.p
          variants={rise}
          className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground"
        >
          {t('hero.subtitle')}
        </motion.p>
        <motion.div variants={rise} className="mt-7 flex justify-center">
          <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}>
            <Button size="lg" variant="flame" asChild>
              <Link to="/new">
                <PlusIcon weight="bold" />
                {t('hero.ctaProblem')}
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}

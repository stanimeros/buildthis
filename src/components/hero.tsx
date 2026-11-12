import { PlusIcon } from '@phosphor-icons/react'
import { m } from 'motion/react'
import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { AuthLink } from '@/components/auth-dialog'
import { Button } from '@/components/ui/button'

// A lime marker that wraps with the text (box-decoration-clone), so long phrases still fit on phones.
function Highlight({ children }: { children?: ReactNode }) {
  return (
    <m.span
      className="box-decoration-clone bg-no-repeat px-[0.08em] [background-image:linear-gradient(var(--lime),var(--lime))] [background-position:0_88%]"
      initial={{ backgroundSize: '0% 52%' }}
      animate={{ backgroundSize: '100% 52%' }}
      transition={{ delay: 0.6, duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
    >
      {children}
    </m.span>
  )
}

/** Compact pitch above the vote board. */
export function Hero() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden">
      <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      {/* The entrance runs in CSS, not motion, so the text paints before the JS loads (LCP). */}
      <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-12 text-center sm:pt-20 sm:pb-16">
        <h1 className="relative text-4xl leading-[0.95] font-extrabold tracking-[-0.04em] text-balance sm:text-6xl md:text-7xl motion-safe:animate-rise motion-safe:[animation-delay:100ms]">
          <Trans i18nKey="hero.title" components={{ hl: <Highlight /> }} />
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground motion-safe:animate-rise motion-safe:[animation-delay:200ms]">
          {t('hero.subtitle')}
        </p>
        <div className="mt-7 flex justify-center motion-safe:animate-rise motion-safe:[animation-delay:300ms]">
          <m.div whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}>
            <Button size="lg" variant="flame" asChild>
              <AuthLink to="/new">
                <PlusIcon weight="bold" />
                {t('hero.ctaProblem')}
              </AuthLink>
            </Button>
          </m.div>
        </div>
      </div>
    </section>
  )
}

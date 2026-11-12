import { ArrowRightIcon, HammerIcon, PlusIcon } from '@phosphor-icons/react'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from '@/lib/nav'

import { Board } from '@/components/board'
import { Community } from '@/components/community'
import { Hero } from '@/components/hero'
import { HowItWorks } from '@/components/how-it-works'
import { AuthLink } from '@/components/auth-dialog'
import { Button } from '@/components/ui/button'

function Bands() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto grid max-w-5xl gap-5 px-4 py-16 md:grid-cols-2">
      <m.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        className="flex flex-col justify-between gap-8 rounded-[2rem] bg-ink p-8 text-background sm:p-10"
      >
        <div>
          <HammerIcon weight="duotone" className="size-10 text-lime" />
          <h3 className="mt-5 text-3xl font-extrabold tracking-tight">{t('home.builderTitle')}</h3>
          <p className="mt-3 text-background/70">{t('home.builderBody')}</p>
        </div>
        <Button variant="lime" size="lg" className="self-start" asChild>
          <Link to="/#board">
            {t('home.builderCta')}
            <ArrowRightIcon weight="bold" />
          </Link>
        </Button>
      </m.div>
      <m.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ delay: 0.1 }}
        className="flex flex-col justify-between gap-8 rounded-[2rem] bg-lime p-8 sm:p-10"
      >
        <h3 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('home.postTitle')}</h3>
        <Button size="lg" className="self-start" asChild>
          <AuthLink to="/new">
            <PlusIcon weight="bold" />
            {t('home.postCta')}
          </AuthLink>
        </Button>
      </m.div>
    </section>
  )
}

export function HomePage() {
  return (
    <>
      <Hero />
      <Board />
      <div className="mt-16">
        <HowItWorks />
      </div>
      <Community />
      <Bands />
    </>
  )
}

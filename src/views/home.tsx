import { ArrowRightIcon, HammerIcon, PlusIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from '@/lib/nav'

import { ExampleIssues } from '@/components/example-issues'
import { Hero } from '@/components/hero'
import { HowItWorks } from '@/components/how-it-works'
import { IssueCard } from '@/components/issue-card'
import { Marquee } from '@/components/marquee'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { useIssues } from '@/lib/hooks'

function TopIssues() {
  const { t } = useTranslation()
  const { data, loading } = useIssues('top', 'all', 5)

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        className="text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{t('home.topTitle')}</h2>
        <p className="mt-3 text-lg text-muted-foreground">{t('home.topSubtitle')}</p>
      </motion.div>
      <div className="mt-12">
        {loading ? (
          <Spinner />
        ) : data.length === 0 ? (
          <ExampleIssues />
        ) : (
          <ul className="space-y-3">
            {data.map((issue, i) => (
              <IssueCard key={issue.id} issue={issue} index={i} />
            ))}
          </ul>
        )}
      </div>
      <div className="mt-8 flex justify-center">
        <Button variant="outline" size="lg" asChild>
          <Link to="/issues">
            {t('home.seeAll')}
            <ArrowRightIcon weight="bold" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

function Bands() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto grid max-w-5xl gap-5 px-4 py-16 md:grid-cols-2">
      <motion.div
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
          <Link to="/issues">
            {t('home.builderCta')}
            <ArrowRightIcon weight="bold" />
          </Link>
        </Button>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ delay: 0.1 }}
        className="flex flex-col justify-between gap-8 rounded-[2rem] bg-lime p-8 sm:p-10"
      >
        <h3 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('home.postTitle')}</h3>
        <Button size="lg" className="self-start" asChild>
          <Link to="/new">
            <PlusIcon weight="bold" />
            {t('home.postCta')}
          </Link>
        </Button>
      </motion.div>
    </section>
  )
}

export function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />
      <TopIssues />
      <HowItWorks />
      <Bands />
    </>
  )
}

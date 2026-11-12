import { ClockIcon, FireIcon, PlusIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { categoryIcons } from '@/components/badges'
import { ExampleIssues } from '@/components/example-issues'
import { IssueCard } from '@/components/issue-card'
import { CountrySelect } from '@/components/place'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { type Sort, useIssues } from '@/lib/hooks'
import { isCountry } from '@/lib/countries'
import { Link, useSearchParams } from '@/lib/nav'
import { type Category, categories } from '@/lib/types'
import { cn } from '@/lib/utils'

/** The live vote board on the home page. Sort and category live in the URL (?sort=new&category=…). */
export function Board() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const sort: Sort = params.get('sort') === 'new' ? 'new' : 'top'
  const rawCat = params.get('category')
  const category: Category | 'all' = categories.includes(rawCat as Category) ? (rawCat as Category) : 'all'
  const rawCountry = params.get('country') ?? ''
  const country = isCountry(rawCountry) ? rawCountry : ''
  const { data, loading, error } = useIssues(sort, category, country)

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  return (
    <section id="board" className="mx-auto max-w-3xl scroll-mt-24 px-4">
      <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('issues.title')}</h2>
      <p className="mt-1 text-muted-foreground">{t('issues.subtitle')}</p>

      {/* Sort + place on one row; categories below. */}
      <div className="mt-6 flex items-center gap-2">
        <div role="tablist" className="flex h-10 shrink-0 rounded-full bg-muted p-1">
          {(['top', 'new'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={sort === s}
              onClick={() => set('sort', s === 'top' ? null : s)}
              className={cn(
                'relative flex items-center gap-1.5 rounded-full px-3 text-sm font-bold transition-colors sm:px-4',
                sort === s ? 'text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {sort === s && <motion.span layoutId="sort-pill" className="absolute inset-0 rounded-full bg-ink" />}
              {s === 'top' ? (
                <FireIcon weight="fill" className={cn('relative size-4', sort === s && 'text-primary')} />
              ) : (
                <ClockIcon weight="bold" className="relative size-4" />
              )}
              <span className="relative">{t(`issues.${s}`)}</span>
            </button>
          ))}
        </div>
        <CountrySelect
          pill
          value={country}
          onChange={(c) => set('country', c || null)}
          placeholder={t('place.all')}
          label={t('place.filterLabel')}
          className="ml-auto min-w-0 flex-1 justify-start sm:max-w-56 sm:flex-none"
        />
      </div>

      <div
        className={cn(
          // Mobile: one swipeable row that fades at the edges. Desktop: wrap so every category shows.
          '-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]',
          '[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-32px),transparent)]',
          'sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]',
        )}
      >
        {(['all', ...categories] as const).map((c) => {
          const Icon = categoryIcons[c]
          const active = category === c
          return (
            <button
              key={c}
              aria-pressed={active}
              onClick={() => set('category', c === 'all' ? null : c)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold whitespace-nowrap transition-colors',
                active ? 'border-ink bg-ink text-background' : 'bg-card text-foreground/80 hover:border-ink/30',
              )}
            >
              <Icon weight={active ? 'fill' : 'duotone'} className={cn('size-4', active && 'text-lime')} />
              {t(`categories.${c}`)}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="py-16 text-center text-muted-foreground">{t('common.error')}</p>
        ) : data.length === 0 && category === 'all' && !country ? (
          <ExampleIssues />
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed py-16 text-center">
            <p className="text-muted-foreground">{t('issues.empty')}</p>
            <Button variant="flame" asChild>
              <Link to="/new">
                <PlusIcon weight="bold" />
                {t('issues.emptyCta')}
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.map((issue, i) => (
              <IssueCard key={issue.id} issue={issue} index={i} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

import { ClockIcon, FireIcon, PlusIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('issues.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('issues.subtitle')}</p>
        </div>
        <div role="tablist" className="flex rounded-full bg-muted p-1">
          {(['top', 'new'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={sort === s}
              onClick={() => set('sort', s === 'top' ? null : s)}
              className={cn(
                'relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-colors',
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
      </div>

      <div className="mt-5 flex">
        <CountrySelect
          pill
          value={country}
          onChange={(c) => set('country', c || null)}
          placeholder={t('place.all')}
          label={t('place.filterLabel')}
          className="w-auto"
        />
      </div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {(['all', ...categories] as const).map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            onClick={() => set('category', c === 'all' ? null : c)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors',
              category === c ? 'border-ink bg-ink text-background' : 'bg-card hover:border-ink/30',
            )}
          >
            {t(`categories.${c}`)}
          </button>
        ))}
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

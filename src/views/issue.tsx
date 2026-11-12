import {
  ArrowLeftIcon, ArrowSquareOutIcon, CheckIcon, DeviceMobileIcon, HammerIcon, PencilSimpleIcon,
  PlusIcon, ShareNetworkIcon, TrashIcon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from '@/lib/nav'
import { toast } from 'sonner'

import { Avatar } from '@/components/avatar'
import { useRequireSignIn } from '@/components/require-auth'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { VoteButton } from '@/components/vote-button'
import { useAuth } from '@/lib/auth'
import {
  adminDeleteIssue, removeSolution, solutionId, toggleBuilder, toggleIssueVote, toggleSolutionVote,
} from '@/lib/data'
import { hostOf, timeAgo } from '@/lib/format'
import { useBuilding, useIssue, useSolutions } from '@/lib/hooks'
import type { Issue, Solution } from '@/lib/types'
import { cn } from '@/lib/utils'

function BuildButton({ issue }: { issue: Issue }) {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const building = useBuilding(issue.id)
  const requireSignIn = useRequireSignIn()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  async function click() {
    if (!user) return requireSignIn()
    if (!profile) return navigate(`/onboarding?next=${encodeURIComponent(`/issues/${issue.id}`)}`)
    setPending(true)
    try {
      await toggleBuilder(issue.id, building)
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
    } finally {
      setPending(false)
    }
  }

  return (
    <motion.div whileTap={{ scale: 0.96 }}>
      <Button
        size="lg"
        variant={building ? 'lime' : 'default'}
        onClick={click}
        disabled={pending}
        aria-pressed={building}
        className="w-full sm:w-auto"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={building ? 'on' : 'off'}
            initial={{ rotate: -90, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            exit={{ rotate: 90, scale: 0 }}
            className="flex"
          >
            {building ? <CheckIcon weight="bold" /> : <HammerIcon weight="duotone" />}
          </motion.span>
        </AnimatePresence>
        {t(building ? 'issue.buildingActive' : 'issue.building')}
        <span className="rounded-full bg-background/20 px-2 py-0.5 text-sm tabular-nums">{issue.builders}</span>
      </Button>
    </motion.div>
  )
}

function SolutionItem({ solution, index }: { solution: Solution; index: number }) {
  const { t } = useTranslation()
  const { user, isAdmin, solutionVotes } = useAuth()
  const mine = user?.uid === solution.authorId

  async function remove() {
    if (!confirm(t('issue.deleteSolutionConfirm'))) return
    try {
      await removeSolution(solution.id, solution.issueId, !mine && isAdmin)
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, delay: index * 0.04 }}
      className={cn('flex items-start gap-4 rounded-3xl border bg-card p-3 pr-5', mine && 'border-primary/40')}
    >
      <VoteButton
        votes={solution.votes}
        voted={solutionVotes.has(solution.id)}
        onToggle={(voted) => toggleSolutionVote(solution.id, voted)}
      />
      <div className="min-w-0 flex-1 py-1">
        <div className="flex flex-wrap items-center gap-2">
          {index === 0 && solution.votes > 0 && <span aria-hidden>🏆</span>}
          <p className="font-heading text-lg font-bold">{solution.title}</p>
          {mine && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {t('issue.yourSolution')}
            </span>
          )}
        </div>
        {solution.body && (
          <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{solution.body}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-muted-foreground">
          <a
            href={solution.url}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-background transition hover:bg-ink/80"
          >
            {hostOf(solution.url)}
            <ArrowSquareOutIcon weight="bold" />
          </a>
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={solution.authorName} photo={solution.authorPhoto} className="size-4" />
            {solution.authorName} · {timeAgo(solution.createdAt)}
          </span>
          {mine && (
            <Link to={`/issues/${solution.issueId}/submit`} className="inline-flex items-center gap-1 hover:text-foreground">
              <PencilSimpleIcon /> {t('issue.edit')}
            </Link>
          )}
          {(mine || isAdmin) && (
            <button onClick={remove} className="inline-flex items-center gap-1 hover:text-destructive">
              <TrashIcon /> {t('issue.delete')}
            </button>
          )}
        </div>
      </div>
    </motion.li>
  )
}

export function IssuePage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isAdmin, issueVotes } = useAuth()
  const { issue, loading } = useIssue(id)
  const solutions = useSolutions(id)

  useEffect(() => {
    if (issue) document.title = `${issue.title} · BuildThis`
  }, [issue])

  if (loading) return <Spinner />
  if (!issue) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-lg text-muted-foreground">{t('issue.notFound')}</p>
        <Button className="mt-6" asChild>
          <Link to="/issues">{t('issue.back')}</Link>
        </Button>
      </div>
    )
  }

  const mine = user?.uid === issue.authorId
  const submitted = !!user && solutions.data.some((s) => s.id === solutionId(issue.id, user.uid))

  async function share() {
    const url = location.href
    try {
      if (navigator.share) await navigator.share({ title: issue!.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success(t('issue.copied'))
      }
    } catch {
      // user cancelled
    }
  }

  async function adminDelete() {
    if (!confirm(t('issue.adminDeleteConfirm'))) return
    await adminDeleteIssue(issue!.id)
    navigate('/issues')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <Link
        to="/issues"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon weight="bold" /> {t('issue.back')}
      </Link>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-[2rem] border bg-card p-6 sm:p-8"
      >
        <div className="flex items-start gap-5">
          <VoteButton
            size="lg"
            votes={issue.votes}
            voted={issueVotes.has(issue.id)}
            onToggle={(voted) => toggleIssueVote(issue.id, voted)}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl leading-tight font-extrabold tracking-tight break-words sm:text-4xl">
              {issue.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-muted-foreground">
              <Link
                to={`/issues?category=${issue.category}`}
                className="rounded-full bg-muted px-3 py-1 hover:bg-secondary"
              >
                {t(`categories.${issue.category}`)}
              </Link>
              <span className="inline-flex items-center gap-1">
                <DeviceMobileIcon weight="duotone" className="size-4" />
                {t(`platforms.${issue.platform}`)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={issue.authorName} photo={issue.authorPhoto} className="size-5" />
                {t('issue.by', { name: issue.authorName })} · {timeAgo(issue.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {issue.body && <p className="mt-6 leading-relaxed break-words whitespace-pre-wrap">{issue.body}</p>}

        <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:flex-wrap sm:items-center">
          <BuildButton issue={issue} />
          <Button size="lg" variant="outline" onClick={share}>
            <ShareNetworkIcon weight="bold" />
            {t('issue.share')}
          </Button>
          {mine && (
            <Button size="lg" variant="ghost" asChild>
              <Link to={`/issues/${issue.id}/edit`}>
                <PencilSimpleIcon weight="bold" />
                {t('issue.edit')}
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button size="lg" variant="destructive" onClick={adminDelete}>
              <TrashIcon weight="bold" />
              {t('issue.adminDelete')}
            </Button>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t('issue.buildingHint')}</p>
      </motion.article>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t('issue.solutionsTitle')}{' '}
            <span className="text-muted-foreground tabular-nums">{issue.solutions}</span>
          </h2>
          {!submitted && (
            <Button variant="flame" asChild>
              <Link to={`/issues/${issue.id}/submit`}>
                <PlusIcon weight="bold" />
                {t('issue.submitSolution')}
              </Link>
            </Button>
          )}
        </div>
        <div className="mt-6">
          {solutions.loading ? (
            <Spinner />
          ) : solutions.data.length === 0 ? (
            <p className="rounded-3xl border border-dashed py-12 text-center text-muted-foreground">
              {t('issue.noSolutions')}
            </p>
          ) : (
            <ul className="space-y-3">
              {solutions.data.map((s, i) => (
                <SolutionItem key={s.id} solution={s} index={i} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

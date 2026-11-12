import {
  ArrowLeftIcon, ArrowSquareOutIcon, CheckIcon, EyeSlashIcon, GhostIcon, HammerIcon, PencilSimpleIcon,
  PlusIcon, PuzzlePieceIcon, ShareNetworkIcon, TrashIcon,
} from '@phosphor-icons/react'
import { AnimatePresence, m } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from '@/lib/nav'
import { toast } from 'sonner'

import { Avatar } from '@/components/avatar'
import { EmptyState, LoadError } from '@/components/empty-state'
import { ReportButton } from '@/components/report-button'
import { useConfirm } from '@/components/confirm'
import { CategoryBadge, PlaceBadge } from '@/components/badges'
import { useRequireSignIn } from '@/components/require-auth'
import { Dots, Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { VoteButton } from '@/components/vote-button'
import { useAuth } from '@/lib/auth'
import {
  adminDeleteIssue, removeSolution, solutionId, toggleBuilder, toggleIssueVote, toggleSolutionVote,
} from '@/lib/data'
import { hostOf, timeAgo } from '@/lib/format'
import { useClaim, useIssue, useSolutions } from '@/lib/hooks'
import type { Issue, Solution } from '@/lib/types'
import { cn } from '@/lib/utils'

function BuildButton({ issue }: { issue: Issue }) {
  const { t } = useTranslation()
  const { user, profile, blocked } = useAuth()
  const claim = useClaim(issue.id)
  const building = !!claim
  const requireSignIn = useRequireSignIn()
  const [pending, setPending] = useState(false)

  async function click() {
    if (!user) return requireSignIn()
    if (blocked) return toast.error(t('blocked.title'))
    if (!profile) return requireSignIn()
    setPending(true)
    try {
      await toggleBuilder(profile, issue.id, building)
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
    } finally {
      setPending(false)
    }
  }

  return (
    <m.div whileTap={{ scale: 0.96 }}>
      <Button
        size="lg"
        variant={building ? 'lime' : 'default'}
        onClick={click}
        loading={pending}
        aria-pressed={building}
        className="w-full sm:w-auto"
      >
        <AnimatePresence mode="wait" initial={false}>
          {!pending && <m.span
            key={building ? 'on' : 'off'}
            initial={{ rotate: -90, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            exit={{ rotate: 90, scale: 0 }}
            className="flex"
          >
            {building ? <CheckIcon weight="bold" /> : <HammerIcon weight="duotone" />}
          </m.span>}
        </AnimatePresence>
        {t(building ? 'issue.buildingActive' : 'issue.building')}
        <span className="rounded-full bg-background/20 px-2 py-0.5 text-sm tabular-nums">{issue.builders}</span>
      </Button>
    </m.div>
  )
}

function SolutionItem({ solution, index }: { solution: Solution; index: number }) {
  const { t } = useTranslation()
  const { user, isAdmin, solutionVotes } = useAuth()
  const mine = user?.uid === solution.authorId
  const [dialog, confirm] = useConfirm()
  const [removing, setRemoving] = useState(false)

  async function remove() {
    const ok = await confirm({ title: t('issue.deleteSolutionConfirm'), confirmLabel: t('issue.delete'), destructive: true })
    if (!ok) return
    setRemoving(true)
    try {
      await removeSolution(solution.id, solution.issueId)
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
      setRemoving(false)
    }
  }

  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, delay: index * 0.04 }}
      className={cn('flex items-start gap-4 rounded-3xl border bg-card p-3 pr-5', mine && 'border-primary/40')}
    >
      {dialog}
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
            <Link to={`/p/${solution.issueId}/submit`} className="inline-flex items-center gap-1 hover:text-foreground">
              <PencilSimpleIcon /> {t('issue.edit')}
            </Link>
          )}
          {(mine || isAdmin) && (
            <button onClick={remove} disabled={removing} className="inline-flex items-center gap-1 hover:text-destructive">
              {removing ? <Dots /> : <TrashIcon />} {t('issue.delete')}
            </button>
          )}
          {!mine && <ReportButton coll="solutions" id={solution.id} authorId={solution.authorId} compact />}
        </div>
      </div>
    </m.li>
  )
}

export function IssuePage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isAdmin, issueVotes } = useAuth()
  const { issue, loading } = useIssue(id)
  const solutions = useSolutions(id)
  const [dialog, confirm] = useConfirm()
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (issue) document.title = `${issue.title} · BuildThis`
  }, [issue])

  if (loading) return <Spinner />
  if (!issue) {
    return (
      <EmptyState icon={GhostIcon} tone="missing" title={t('issue.notFound')} className="mx-auto max-w-xl py-24">
        <Button asChild>
          <Link to="/">{t('issue.back')}</Link>
        </Button>
      </EmptyState>
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
    const ok = await confirm({ title: t('issue.adminDeleteConfirm'), confirmLabel: t('issue.delete'), destructive: true })
    if (!ok) return
    setDeleting(true)
    try {
      await adminDeleteIssue(issue!.id)
      navigate('/')
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      {dialog}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon weight="bold" /> {t('issue.back')}
      </Link>

      {issue.hidden && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <EyeSlashIcon weight="duotone" className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p>{t('report.hiddenNotice')}</p>
        </div>
      )}

      <m.article
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
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/?category=${issue.category}#board`} className="rounded-full transition hover:brightness-95">
                <CategoryBadge category={issue.category} size="md" />
              </Link>
              <Link
                to={issue.country ? `/?country=${issue.country}#board` : '/#board'}
                className="rounded-full transition hover:brightness-95"
              >
                <PlaceBadge country={issue.country} size="md" />
              </Link>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Avatar name={issue.authorName} photo={issue.authorPhoto} className="size-5" />
              {t('issue.by', { name: issue.authorName })} · {timeAgo(issue.createdAt)}
            </p>
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
              <Link to={`/p/${issue.id}/edit`}>
                <PencilSimpleIcon weight="bold" />
                {t('issue.edit')}
              </Link>
            </Button>
          )}
          {!mine && <ReportButton coll="issues" id={issue.id} authorId={issue.authorId} />}
          {isAdmin && (
            <Button size="lg" variant="destructive" onClick={adminDelete} loading={deleting}>
              <TrashIcon weight="bold" />
              {t('issue.adminDelete')}
            </Button>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t('issue.buildingHint')}</p>
      </m.article>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t('issue.solutionsTitle')}{' '}
            <span className="text-muted-foreground tabular-nums">{issue.solutions}</span>
          </h2>
          {!submitted && (
            <Button variant="flame" asChild>
              <Link to={`/p/${issue.id}/submit`}>
                <PlusIcon weight="bold" />
                {t('issue.submitSolution')}
              </Link>
            </Button>
          )}
        </div>
        <div className="mt-6">
          {solutions.loading ? (
            <Spinner />
          ) : solutions.error ? (
            <LoadError />
          ) : solutions.data.length === 0 ? (
            <EmptyState icon={PuzzlePieceIcon} title={t('issue.noSolutions')} body={t('issue.noSolutionsBody')} />
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

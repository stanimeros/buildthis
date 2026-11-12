import { EyeSlashIcon, HammerIcon, PuzzlePieceIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/avatar'
import { Badge, CategoryBadge, PlaceBadge } from '@/components/badges'
import { VoteButton } from '@/components/vote-button'
import { useAuth } from '@/lib/auth'
import { toggleIssueVote } from '@/lib/data'
import { timeAgo } from '@/lib/format'
import { Link } from '@/lib/nav'
import type { Issue } from '@/lib/types'

export function IssueCard({ issue, index = 0 }: { issue: Issue; index?: number }) {
  const { t } = useTranslation()
  const { issueVotes } = useAuth()

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, delay: Math.min(index, 10) * 0.03 }}
    >
      <Link
        to={`/p/${issue.id}`}
        className="group flex items-start gap-3 rounded-3xl border bg-card p-3 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_oklch(0.18_0.01_60/0.35)] sm:gap-4 sm:pr-5"
      >
        <VoteButton
          votes={issue.votes}
          voted={issueVotes.has(issue.id)}
          onToggle={(voted) => toggleIssueVote(issue.id, voted)}
        />
        <div className="min-w-0 flex-1 py-0.5">
          <p className="leading-snug font-semibold break-words group-hover:text-primary sm:text-lg">{issue.title}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {issue.hidden && (
              <Badge icon={<EyeSlashIcon weight="bold" />} className="bg-destructive/10 text-destructive">
                {t('report.hiddenBadge')}
              </Badge>
            )}
            <CategoryBadge category={issue.category} />
            <PlaceBadge country={issue.country} />
          </div>
          <div className="mt-2.5 flex items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Avatar name={issue.authorName} photo={issue.authorPhoto} className="size-4" />
              <span className="truncate">
                {issue.authorName} · {timeAgo(issue.createdAt)}
              </span>
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-3 tabular-nums">
              <span className="inline-flex items-center gap-1" title={t('count.builders', { count: issue.builders })}>
                <HammerIcon weight="duotone" className="size-4" />
                <span aria-hidden>{issue.builders}</span>
                <span className="sr-only">{t('count.builders', { count: issue.builders })}</span>
              </span>
              <span className="inline-flex items-center gap-1" title={t('count.solutions', { count: issue.solutions })}>
                <PuzzlePieceIcon weight="duotone" className="size-4" />
                <span aria-hidden>{issue.solutions}</span>
                <span className="sr-only">{t('count.solutions', { count: issue.solutions })}</span>
              </span>
            </span>
          </div>
        </div>
      </Link>
    </motion.li>
  )
}

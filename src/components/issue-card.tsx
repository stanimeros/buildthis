import { HammerIcon, PuzzlePieceIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from '@/lib/nav'

import { Avatar } from '@/components/avatar'
import { VoteButton } from '@/components/vote-button'
import { useAuth } from '@/lib/auth'
import { toggleIssueVote } from '@/lib/data'
import { timeAgo } from '@/lib/format'
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
        to={`/issues/${issue.id}`}
        className="group flex items-start gap-4 rounded-3xl border bg-card p-3 pr-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_oklch(0.18_0.01_60/0.35)]"
      >
        <VoteButton
          votes={issue.votes}
          voted={issueVotes.has(issue.id)}
          onToggle={(voted) => toggleIssueVote(issue.id, voted)}
        />
        <div className="min-w-0 flex-1 py-1">
          <p className="font-semibold leading-snug break-words group-hover:text-primary sm:text-lg">{issue.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1">{t(`categories.${issue.category}`)}</span>
            <span className="inline-flex items-center gap-1">
              <HammerIcon weight="duotone" className="size-4" />
              {t('count.builders', { count: issue.builders })}
            </span>
            <span className="inline-flex items-center gap-1">
              <PuzzlePieceIcon weight="duotone" className="size-4" />
              {t('count.solutions', { count: issue.solutions })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={issue.authorName} photo={issue.authorPhoto} className="size-4" />
              {issue.authorName} · {timeAgo(issue.createdAt)}
            </span>
          </div>
        </div>
      </Link>
    </motion.li>
  )
}

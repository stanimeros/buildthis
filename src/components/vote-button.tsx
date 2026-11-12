import { ArrowFatUpIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAuth } from '@/lib/auth'
import { useRequireSignIn } from '@/components/require-auth'
import { cn } from '@/lib/utils'

export function VoteButton({
  votes,
  voted,
  onToggle,
  size = 'md',
}: {
  votes: number
  voted: boolean
  onToggle: (voted: boolean) => Promise<void>
  size?: 'md' | 'lg'
}) {
  const { t } = useTranslation()
  const { user, blocked } = useAuth()
  const requireSignIn = useRequireSignIn()
  const [pending, setPending] = useState(false)

  async function click(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return requireSignIn()
    if (blocked) return toast.error(t('blocked.title'))
    if (pending) return
    setPending(true)
    try {
      await onToggle(voted)
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
    } finally {
      setPending(false)
    }
  }

  return (
    <motion.button
      type="button"
      onClick={click}
      aria-pressed={voted}
      aria-label={`${t(voted ? 'issues.removeVote' : 'issues.upvote')} · ${t('count.votes', { count: votes })}`}
      title={user ? undefined : t('common.signInToVote')}
      whileTap={{ scale: 0.85 }}
      className={cn(
        'flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border font-heading font-bold transition-colors',
        size === 'lg' ? 'w-20 py-3 text-lg' : 'w-16 py-2',
        voted ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-ink/30',
        pending && 'animate-pulse',
      )}
    >
      <motion.span animate={voted ? { y: [0, -6, 0] } : { y: 0 }} transition={{ duration: 0.35 }}>
        <ArrowFatUpIcon weight={voted ? 'fill' : 'bold'} className={size === 'lg' ? 'size-6' : 'size-5'} />
      </motion.span>
      <span className="relative h-[1.25em] overflow-hidden tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={votes}
            className="block"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {votes}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  )
}

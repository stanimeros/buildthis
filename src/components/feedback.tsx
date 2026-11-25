import { ChatCircleIcon, PaperPlaneRightIcon, TrashIcon } from '@phosphor-icons/react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Avatar } from '@/components/avatar'
import { useRequireSignIn } from '@/components/require-auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth'
import { deleteComment, postComment } from '@/lib/data'
import { authorLabel, timeAgo } from '@/lib/format'
import { useComments } from '@/lib/hooks'
import { cooldownLeft, LIMITS } from '@/lib/quota'
import { limits, type Solution } from '@/lib/types'

/** Public feedback under a solution: a toggle with the count, then the list and a box to write. */
export function Feedback({ solution }: { solution: Solution }) {
  const { t } = useTranslation()
  const { user, profile, isAdmin, blocked } = useAuth()
  const requireSignIn = useRequireSignIn()
  const comments = useComments(solution.id)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const count = comments.data.length
  const builder = user?.uid === solution.authorId

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!user || !profile) return requireSignIn()
    const clean = text.trim()
    if (!clean) return
    const wait = cooldownLeft(profile.lastCommentAt, LIMITS.commentCooldownMin)
    if (wait) return toast.error(t('feedback.cooldown'))
    setSending(true)
    try {
      await postComment(profile, solution.id, clean)
      setText('')
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
    } finally {
      setSending(false)
    }
  }

  async function remove(id: string) {
    try {
      await deleteComment(solution.id, id)
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChatCircleIcon weight={open ? 'fill' : 'bold'} />
        {count ? t('feedback.toggleCount', { count }) : t('feedback.toggle')}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {count > 0 && (
            <ul className="space-y-3">
              {comments.data.map((c) => (
                <li key={c.id} className="flex gap-2.5 text-sm">
                  <Avatar name={c.authorName} photo={c.authorPhoto} className="mt-0.5 size-6 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-muted-foreground">
                      <span className="text-foreground">{authorLabel(c.authorName)}</span>
                      {c.authorId === solution.authorId && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{t('feedback.builder')}</span>
                      )}
                      <span>{timeAgo(c.createdAt)}</span>
                      {(user?.uid === c.authorId || builder || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => remove(c.id)}
                          aria-label={t('issue.delete')}
                          className="hover:text-destructive"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </p>
                    <p className="mt-0.5 break-words whitespace-pre-wrap">{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!blocked && (
            <form onSubmit={send} className="flex items-end gap-2">
              <Textarea
                rows={2}
                value={text}
                maxLength={limits.comment[1]}
                placeholder={t(builder ? 'feedback.placeholderBuilder' : 'feedback.placeholder')}
                onFocus={() => !user && requireSignIn()}
                onChange={(e) => setText(e.target.value)}
                className="min-h-0 flex-1 resize-none"
              />
              <Button type="submit" size="icon-lg" aria-label={t('feedback.send')} loading={sending} disabled={!text.trim()}>
                <PaperPlaneRightIcon weight="fill" />
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

import { HammerIcon, HourglassIcon, RocketLaunchIcon } from '@phosphor-icons/react'
import { doc, getDoc } from 'firebase/firestore'
import { m } from 'motion/react'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from '@/lib/nav'
import { toast } from 'sonner'

import { BlockedNotice } from '@/components/blocked-notice'
import { Field, FormCard } from '@/components/field'
import { Page } from '@/components/layout'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth'
import { claimWaitLeft, cooldownLeft, LIMITS, usedToday } from '@/lib/quota'
import { solutionId, submitSolution, updateSolution } from '@/lib/data'
import { db } from '@/lib/firebase'
import { useClaim, useIssue } from '@/lib/hooks'
import { limits, type Solution } from '@/lib/types'
import { NotFoundPage } from '@/views/not-found'

const URL_RE = /^https:\/\/[^\s]+\.[^\s]+$/

/** /p/:id/submit: creates, or edits if the user already submitted one. */
export function SolutionFormPage() {
  const { id = '' } = useParams()
  const { user, blocked } = useAuth()
  const { issue, loading } = useIssue(id)
  const claim = useClaim(id)
  const [existing, setExisting] = useState<{ id: string; data: Solution | null } | null>(null)

  useEffect(() => {
    if (!user) return
    const sid = solutionId(id, user.uid)
    getDoc(doc(db, 'solutions', sid))
      .then((s) => setExisting({ id: sid, data: s.exists() ? ({ id: s.id, ...s.data() } as Solution) : null }))
      .catch(() => setExisting({ id: sid, data: null }))
  }, [id, user])

  if (blocked) return <BlockedNotice />
  if (loading || !existing || claim === undefined) return <Spinner />
  if (!issue) return <NotFoundPage />
  // New submissions need a claim at least an hour old (enforced by the rules too).
  const waitMs = claimWaitLeft(claim)
  if (!existing.data && waitMs > 0) return <ClaimGate issueId={issue.id} claimed={!!claim} waitMs={waitMs} />
  return <SolutionForm issueId={issue.id} issueTitle={issue.title} existing={existing.data} />
}

function ClaimGate({ issueId, claimed, waitMs }: { issueId: string; claimed: boolean; waitMs: number }) {
  const { t } = useTranslation()
  return (
    <Page narrow>
      <FormCard>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <m.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="flex size-16 items-center justify-center rounded-2xl bg-lime"
          >
            {claimed ? <HourglassIcon weight="duotone" className="size-8" /> : <HammerIcon weight="duotone" className="size-8" />}
          </m.div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {t(claimed ? 'solution.claimWait' : 'solution.claimFirst')}
          </h1>
          <p className="text-muted-foreground">
            {claimed
              ? t('solution.claimWaitBody', { minutes: Math.ceil(waitMs / 60_000) })
              : t('solution.claimFirstBody')}
          </p>
          <Button size="lg" asChild>
            <Link to={`/p/${issueId}`}>{t('solution.backToProblem')}</Link>
          </Button>
        </div>
      </FormCard>
    </Page>
  )
}

function SolutionForm({
  issueId,
  issueTitle,
  existing,
}: {
  issueId: string
  issueTitle: string
  existing: Solution | null
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [url, setUrl] = useState(existing?.url ?? 'https://')
  const [body, setBody] = useState(existing?.body ?? '')
  const [errors, setErrors] = useState<{ title?: boolean; url?: boolean }>({})
  const [sending, setSending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean = { title: title.trim(), url: url.trim(), body: body.trim() }
    const next = {
      title: clean.title.length < limits.solutionTitle[0] || clean.title.length > limits.solutionTitle[1],
      url: !URL_RE.test(clean.url) || clean.url.length > 300,
    }
    setErrors(next)
    if (next.title || next.url) return
    if (!existing && profile && usedToday(profile, 'solutions') >= LIMITS.solutionsPerDay) {
      toast.error(t('solution.dailyLimit'))
      return
    }
    const wait = existing ? 0 : cooldownLeft(profile?.lastSolutionAt, LIMITS.solutionCooldownMin)
    if (wait) {
      toast.error(t('solution.cooldown', { count: wait }))
      return
    }
    setSending(true)
    try {
      if (existing) await updateSolution(profile!, existing.id, clean)
      else await submitSolution(profile!, issueId, clean)
      navigate(`/p/${issueId}`)
    } catch (err) {
      console.error(err)
      toast.error(t('solution.error'))
      setSending(false)
    }
  }

  return (
    <Page narrow title={t(existing ? 'solution.editTitle' : 'solution.title')} subtitle={t('solution.subtitle')}>
      <Link
        to={`/p/${issueId}`}
        className="mt-4 inline-block rounded-full border bg-card px-3 py-1 text-sm font-semibold hover:bg-muted"
      >
        {t('solution.forIssue', { title: issueTitle })}
      </Link>
      <FormCard>
        <form onSubmit={submit} noValidate className="space-y-6">
          <Field
            id="name"
            label={t('solution.fieldName')}
            error={errors.title ? t('solution.nameLength') : null}
            count={[title.length, limits.solutionTitle[1]]}
          >
            <Input
              id="name"
              autoFocus
              placeholder={t('solution.namePlaceholder')}
              value={title}
              maxLength={limits.solutionTitle[1]}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={errors.title}
            />
          </Field>
          <Field
            id="url"
            label={t('solution.fieldUrl')}
            hint={t('solution.urlHint')}
            error={errors.url ? t('solution.invalidUrl') : null}
          >
            <Input
              id="url"
              type="url"
              inputMode="url"
              placeholder={t('solution.urlPlaceholder')}
              value={url}
              maxLength={300}
              onChange={(e) => setUrl(e.target.value)}
              aria-invalid={errors.url}
            />
          </Field>
          <Field id="body" label={t('solution.fieldBody')} count={[body.length, limits.solutionBody[1]]}>
            <Textarea
              id="body"
              rows={4}
              placeholder={t('solution.bodyPlaceholder')}
              value={body}
              maxLength={limits.solutionBody[1]}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button type="submit" size="lg" variant="flame" className="group w-full" loading={sending}>
              {t(sending ? 'solution.submitting' : existing ? 'solution.save' : 'solution.submit')}
              <RocketLaunchIcon
                weight="fill"
                className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </Button>
          </m.div>
        </form>
      </FormCard>
    </Page>
  )
}

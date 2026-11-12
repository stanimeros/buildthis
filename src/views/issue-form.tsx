import { PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from '@/lib/nav'
import { toast } from 'sonner'

import { BlockedNotice } from '@/components/blocked-notice'
import { Chips, Field, FormCard } from '@/components/field'
import { CountrySelect } from '@/components/place'
import { Page } from '@/components/layout'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth'
import { inCooldown, LIMITS, usedToday } from '@/lib/quota'
import { postIssue, updateIssue } from '@/lib/data'
import { useIssue } from '@/lib/hooks'
import { type Category, categories, type IssueInput, limits } from '@/lib/types'

/** /new and /p/:id/edit */
export function IssueFormPage() {
  const { id } = useParams()
  const { issue, loading } = useIssue(id ?? '__none__')
  const { blocked } = useAuth()
  if (blocked) return <BlockedNotice />
  if (id && loading) return <Spinner />
  return <IssueForm key={issue?.id ?? 'new'} editId={id} initial={issue ?? undefined} />
}

function IssueForm({
  editId,
  initial,
}: {
  editId?: string
  initial?: IssueInput & { authorId: string }
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'productivity')
  const [scoped, setScoped] = useState(!!initial?.country)
  const [country, setCountry] = useState(initial?.country || profile?.country || '')
  const [countryError, setCountryError] = useState(false)
  const [sending, setSending] = useState(false)
  const [titleError, setTitleError] = useState(false)

  const editing = !!editId
  const forbidden = editing && (!initial || initial.authorId !== user?.uid)

  useEffect(() => {
    if (forbidden) navigate(editId ? `/p/${editId}` : '/', { replace: true })
  }, [forbidden, editId, navigate])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean: IssueInput = {
      title: title.trim(),
      body: body.trim(),
      category,
      country: scoped ? country : '',
    }
    const [min, max] = limits.issueTitle
    if (clean.title.length < min || clean.title.length > max) {
      setTitleError(true)
      return
    }
    setTitleError(false)
    if (scoped && !country) {
      setCountryError(true)
      return
    }
    setCountryError(false)
    if (!editing && profile && usedToday(profile, 'issues') >= LIMITS.issuesPerDay) {
      toast.error(t('newIssue.dailyLimit'))
      return
    }
    if (!editing && inCooldown(profile?.lastIssueAt, LIMITS.issueCooldownMin)) {
      toast.error(t('newIssue.cooldown'))
      return
    }
    setSending(true)
    try {
      if (editing) {
        await updateIssue(profile!, editId!, clean)
        navigate(`/p/${editId}`)
      } else {
        const newId = await postIssue(profile!, clean)
        navigate(`/p/${newId}`)
      }
    } catch (err) {
      console.error(err)
      toast.error(t('newIssue.error'))
      setSending(false)
    }
  }

  if (forbidden) return null

  return (
    <Page narrow title={t(editing ? 'newIssue.editTitle' : 'newIssue.title')} subtitle={t('newIssue.subtitle')}>
      <FormCard>
        <form onSubmit={submit} noValidate className="space-y-6">
          <Field
            id="title"
            label={t('newIssue.fieldTitle')}
            error={titleError ? t('newIssue.titleLength') : null}
            count={[title.length, limits.issueTitle[1]]}
          >
            <Input
              id="title"
              autoFocus
              placeholder={t('newIssue.titlePlaceholder')}
              value={title}
              maxLength={limits.issueTitle[1]}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={titleError}
            />
          </Field>
          <Field id="body" label={t('newIssue.fieldBody')} count={[body.length, limits.issueBody[1]]}>
            <Textarea
              id="body"
              rows={5}
              placeholder={t('newIssue.bodyPlaceholder')}
              value={body}
              maxLength={limits.issueBody[1]}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <Field label={t('newIssue.fieldCategory')}>
            <Chips options={categories} value={category} onChange={setCategory} label={(c) => t(`categories.${c}`)} />
          </Field>
          <Field label={t('place.label')}>
            <Chips
              options={['anywhere', 'specific'] as const}
              value={scoped ? 'specific' : 'anywhere'}
              onChange={(v) => setScoped(v === 'specific')}
              label={(v) => t(`place.${v}`)}
            />
          </Field>
          {scoped && (
            <Field id="country" label={t('place.country')} error={countryError ? t('place.countryRequired') : null}>
              <CountrySelect
                id="country"
                value={country}
                onChange={setCountry}
                placeholder={t('place.chooseCountry')}
                invalid={countryError}
              />
            </Field>
          )}
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button type="submit" size="lg" variant="flame" className="group w-full" disabled={sending}>
              {t(sending ? 'newIssue.submitting' : editing ? 'newIssue.save' : 'newIssue.submit')}
              <PaperPlaneTiltIcon
                weight="fill"
                className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:rotate-12"
              />
            </Button>
          </motion.div>
        </form>
      </FormCard>
    </Page>
  )
}

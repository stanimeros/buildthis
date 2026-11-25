import { GlobeHemisphereEastIcon, MapPinIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { m } from 'motion/react'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from '@/lib/nav'
import { toast } from 'sonner'

import { categoryIcons } from '@/components/badges'
import { BlockedNotice } from '@/components/blocked-notice'
import { Chips, Field, FormCard } from '@/components/field'
import { CountrySelect } from '@/components/place'
import { Page } from '@/components/layout'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth'
import { cooldownLeft, LIMITS, usedToday } from '@/lib/quota'
import { postIssue, submitSolution, updateIssue } from '@/lib/data'
import { useIssue } from '@/lib/hooks'
import { type Category, categories, type IssueInput, limits } from '@/lib/types'

const URL_RE = /^https:\/\/[^\s]+\.[^\s]+$/

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
  // "I already built a solution": posted right after the problem, as the author's own solution.
  const [built, setBuilt] = useState(false)
  const [appName, setAppName] = useState('')
  const [appUrl, setAppUrl] = useState('https://')
  const [appErrors, setAppErrors] = useState<{ name?: boolean; url?: boolean }>({})

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
    const app = { title: appName.trim(), url: appUrl.trim(), body: '' }
    if (built && !editing) {
      const next = {
        name: app.title.length < limits.solutionTitle[0] || app.title.length > limits.solutionTitle[1],
        url: !URL_RE.test(app.url) || app.url.length > 300,
      }
      setAppErrors(next)
      if (next.name || next.url) return
      if (profile && usedToday(profile, 'solutions') >= LIMITS.solutionsPerDay) {
        toast.error(t('solution.dailyLimit'))
        return
      }
      const appWait = cooldownLeft(profile?.lastSolutionAt, LIMITS.solutionCooldownMin)
      if (appWait) {
        toast.error(t('solution.cooldown', { count: appWait }))
        return
      }
    }
    if (!editing && profile && usedToday(profile, 'issues') >= LIMITS.issuesPerDay) {
      toast.error(t('newIssue.dailyLimit'))
      return
    }
    const wait = editing ? 0 : cooldownLeft(profile?.lastIssueAt, LIMITS.issueCooldownMin)
    if (wait) {
      toast.error(t('newIssue.cooldown', { count: wait }))
      return
    }
    setSending(true)
    try {
      if (editing) {
        await updateIssue(profile!, editId!, clean)
        navigate(`/p/${editId}`)
      } else {
        const newId = await postIssue(profile!, clean)
        if (built) {
          // The problem is up either way; if this fails they can add it from the problem page.
          await submitSolution(profile!, newId, app).catch((err) => {
            console.error(err)
            toast.error(t('solution.error'))
          })
        }
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
            <Chips
              options={categories}
              value={category}
              onChange={setCategory}
              label={(c) => t(`categories.${c}`)}
              icon={(c) => categoryIcons[c]}
            />
          </Field>
          <Field label={t('place.label')}>
            <Chips
              options={['anywhere', 'specific'] as const}
              value={scoped ? 'specific' : 'anywhere'}
              onChange={(v) => setScoped(v === 'specific')}
              label={(v) => t(`place.${v}`)}
              icon={(v) => (v === 'anywhere' ? GlobeHemisphereEastIcon : MapPinIcon)}
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
          {!editing && (
            <div className="space-y-4 rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="built" className="font-bold">
                    {t('newIssue.built')}
                  </Label>
                  <p className="text-sm text-muted-foreground">{t('newIssue.builtBody')}</p>
                </div>
                <Switch id="built" checked={built} onCheckedChange={setBuilt} className="mt-1" />
              </div>
              {built && (
                <>
                  <Field
                    id="app-name"
                    label={t('solution.fieldName')}
                    error={appErrors.name ? t('solution.nameLength') : null}
                    count={[appName.length, limits.solutionTitle[1]]}
                  >
                    <Input
                      id="app-name"
                      placeholder={t('solution.namePlaceholder')}
                      value={appName}
                      maxLength={limits.solutionTitle[1]}
                      onChange={(e) => setAppName(e.target.value)}
                      aria-invalid={appErrors.name}
                    />
                  </Field>
                  <Field
                    id="app-url"
                    label={t('solution.fieldUrl')}
                    hint={t('solution.urlHint')}
                    error={appErrors.url ? t('solution.invalidUrl') : null}
                  >
                    <Input
                      id="app-url"
                      type="url"
                      inputMode="url"
                      value={appUrl}
                      maxLength={300}
                      onChange={(e) => setAppUrl(e.target.value)}
                      aria-invalid={appErrors.url}
                    />
                  </Field>
                </>
              )}
            </div>
          )}
          <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button type="submit" size="lg" variant="flame" className="group w-full" loading={sending}>
              {t(sending ? 'newIssue.submitting' : editing ? 'newIssue.save' : 'newIssue.submit')}
              <PaperPlaneTiltIcon
                weight="fill"
                className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:rotate-12"
              />
            </Button>
          </m.div>
        </form>
      </FormCard>
    </Page>
  )
}

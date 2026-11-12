import { ArrowFatUpIcon, LightbulbIcon, PlusIcon, PuzzlePieceIcon, SignOutIcon, TrashIcon } from '@phosphor-icons/react'
import { m } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from '@/lib/nav'
import { toast } from 'sonner'

import { AuthLink } from '@/components/auth-dialog'
import { Avatar } from '@/components/avatar'
import { BlockedNotice } from '@/components/blocked-notice'
import { useConfirm } from '@/components/confirm'
import { EmptyState, LoadError } from '@/components/empty-state'
import { Chips, Field } from '@/components/field'
import { IssueCard } from '@/components/issue-card'
import { Page } from '@/components/layout'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { CountrySelect } from '@/components/place'
import { Input } from '@/components/ui/input'
import { currentLanguage } from '@/i18n'
import { isGoogle, signOut, useAuth } from '@/lib/auth'
import { isCountry } from '@/lib/countries'
import { deleteAccount, googlePhoto, isReservedName, updateProfile } from '@/lib/data'
import { hostOf, timeAgo } from '@/lib/format'
import { useMyIssues, useMySolutions, useVotedIssues } from '@/lib/hooks'
import { type Profile, stacks } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PublicToggle, RolePicker } from '@/views/onboarding'

type Tab = 'issues' | 'solutions' | 'votes'

function ProfileForm({ profile }: { profile: Profile }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const googleAvatar = googlePhoto(user?.photoURL)
  const [name, setName] = useState(profile.name)
  const [photo, setPhoto] = useState(profile.photo)
  const [role, setRole] = useState(profile.role)
  // Older profiles stored free text here; only keep it if it's a country code.
  const [country, setCountry] = useState(isCountry(profile.country) ? profile.country : '')
  const [stack, setStack] = useState(profile.stack)
  const [link, setLink] = useState(profile.link)
  const [isPublic, setPublic] = useState(profile.public ?? false)
  const [saving, setSaving] = useState(false)
  const builder = role !== 'user'
  const linkOk = !link.trim() || /^https:\/\/\S+\.\S+$/.test(link.trim())
  const nameOk = name.trim().length >= 1 && !isReservedName(name)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!linkOk || !nameOk) return
    setSaving(true)
    try {
      await updateProfile(profile, {
        name: name.trim(),
        photo,
        role,
        country,
        stack: builder ? stack : [],
        link: builder ? link.trim() : '',
        lang: currentLanguage(),
        public: builder && isPublic,
      })
      toast.success(t('me.saved'))
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <Field id="name" label={t('onboarding.name')} error={isReservedName(name) ? t('onboarding.nameReserved') : null}>
        <Input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-invalid={!nameOk} />
      </Field>
      <Field label={t('me.photo')} hint={t('me.photoHint')}>
        <div className="flex items-center gap-4">
          <Avatar name={name || profile.name} photo={photo} className="size-14 text-xl" />
          {photo ? (
            <Button type="button" variant="outline" onClick={() => setPhoto('')}>
              {t('me.photoRemove')}
            </Button>
          ) : (
            googleAvatar && (
              <Button type="button" variant="outline" onClick={() => setPhoto(googleAvatar)}>
                {t('me.photoGoogle')}
              </Button>
            )
          )}
        </div>
      </Field>
      <Field label={t('me.role')}>
        <RolePicker value={role} onChange={setRole} />
      </Field>
      <Field id="country" label={t('onboarding.country')}>
        <CountrySelect id="country" value={country} onChange={setCountry} placeholder={t('place.chooseCountry')} />
      </Field>
      {builder && (
        <>
          <Field label={t('onboarding.stack')}>
            <Chips
              options={stacks}
              value={stack}
              label={(s) => s}
              onChange={(s) => setStack((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
            />
          </Field>
          <Field id="link" label={t('onboarding.link')} error={linkOk ? null : t('solution.invalidUrl')}>
            <Input
              id="link"
              type="url"
              value={link}
              maxLength={200}
              placeholder={t('onboarding.linkPlaceholder')}
              onChange={(e) => setLink(e.target.value)}
              aria-invalid={!linkOk}
            />
          </Field>
          <PublicToggle value={isPublic} onChange={setPublic} />
        </>
      )}
      <Button type="submit" size="lg" loading={saving}>
        {t('me.save')}
      </Button>
    </form>
  )
}

function Lists({ uid }: { uid: string }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('issues')
  const issues = useMyIssues(uid)
  const solutions = useMySolutions(uid)
  const votes = useVotedIssues()
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'issues', label: t('me.myIssues'), count: issues.data.length },
    { id: 'solutions', label: t('me.mySolutions'), count: solutions.data.length },
    { id: 'votes', label: t('me.myVotes'), count: votes.data.length },
  ]
  const current = tab === 'issues' ? issues : tab === 'solutions' ? solutions : votes
  const empty = {
    issues: {
      icon: LightbulbIcon,
      title: t('me.noIssues'),
      cta: (
        <AuthLink to="/new">
          <PlusIcon weight="bold" />
          {t('nav.post')}
        </AuthLink>
      ),
    },
    solutions: { icon: PuzzlePieceIcon, title: t('me.noSolutions'), cta: <Link to="/#board">{t('home.builderCta')}</Link> },
    votes: { icon: ArrowFatUpIcon, title: t('me.noVotes'), cta: <Link to="/#board">{t('issue.back')}</Link> },
  }[tab]

  return (
    <section className="mt-12">
      <div role="tablist" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex rounded-full border bg-card p-1">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                'relative rounded-full px-4 py-1.5 text-sm font-bold whitespace-nowrap transition-colors',
                tab === id ? 'text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === id && <m.span layoutId="me-tab" className="absolute inset-0 rounded-full bg-ink" />}
              <span className="relative">
                {label} <span className="opacity-60 tabular-nums">{count}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6">
        {current.loading ? (
          <Spinner />
        ) : 'error' in current && current.error ? (
          <LoadError />
        ) : current.data.length === 0 ? (
          <EmptyState icon={empty.icon} title={empty.title}>
            <Button variant="outline" asChild>
              {empty.cta}
            </Button>
          </EmptyState>
        ) : tab === 'solutions' ? (
          <ul className="space-y-3">
            {solutions.data.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/p/${s.issueId}`}
                  className="flex items-center gap-4 rounded-3xl border bg-card p-4 transition hover:-translate-y-0.5"
                >
                  <span className="w-20 shrink-0 text-center font-heading text-sm font-bold tabular-nums">
                    {t('count.votes', { count: s.votes })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{s.title}</span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {hostOf(s.url)} · {timeAgo(s.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-3">
            {(current.data as typeof issues.data).map((issue, i) => (
              <IssueCard key={issue.id} issue={issue} index={i} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export function MePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, blocked } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const [dialog, confirm] = useConfirm()
  if (!user || !profile) return <Spinner />
  const current = { user, profile }

  async function out() {
    await signOut()
    navigate('/')
  }

  async function remove() {
    const withPassword = !isGoogle(current.user)
    const ok = await confirm({
      title: t('me.deleteConfirm'),
      description: t('me.dangerBody'),
      confirmLabel: t('me.danger'),
      destructive: true,
      ...(withPassword && { input: { label: t('signin.password'), type: 'password', autoComplete: 'current-password' } }),
    })
    if (!ok) return
    setDeleting(true)
    try {
      await deleteAccount(current.profile, typeof ok === 'string' ? ok : undefined)
      toast.success(t('me.deleted'))
      navigate('/')
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        toast.error(t('signin.wrongPassword'))
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        console.error(err)
        toast.error(t('common.error'))
      }
      setDeleting(false)
    }
  }

  return (
    <Page>
      {dialog}
      {blocked && (
        <div className="-mt-12 mb-8">
          <BlockedNotice />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={profile.name} photo={profile.photo} className="size-16 text-2xl" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{profile.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={out}>
          <SignOutIcon weight="bold" />
          {t('nav.signOut')}
        </Button>
      </div>

      <Lists uid={user.uid} />

      <section className="mt-16 rounded-[2rem] border bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold tracking-tight">{t('me.profile')}</h2>
        <div className="mt-6">
          <ProfileForm profile={profile} />
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-destructive/30 bg-card p-6 sm:p-8">
        <h2 className="text-xl font-bold text-destructive">{t('me.danger')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('me.dangerBody')}</p>
        <Button variant="destructive" className="mt-4" onClick={remove} loading={deleting}>
          <TrashIcon weight="bold" />
          {t('me.danger')}
        </Button>
      </section>
    </Page>
  )
}

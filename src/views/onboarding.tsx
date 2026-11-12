import { HammerIcon, LightbulbIcon, SparkleIcon } from '@phosphor-icons/react'
import { AnimatePresence, m } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from '@/lib/nav'
import { toast } from 'sonner'

import { SignInPrompt } from '@/components/auth-dialog'
import { Chips, Field } from '@/components/field'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { CountrySelect } from '@/components/place'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { currentLanguage } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { createProfile, isReservedName } from '@/lib/data'
import { guessCountry } from '@/lib/countries'
import { safeNext } from '@/lib/next'
import { getSource } from '@/lib/source'
import { type Role, stacks } from '@/lib/types'
import { cn } from '@/lib/utils'

const roleCards = [
  { role: 'user', icon: LightbulbIcon, tile: 'bg-sky' },
  { role: 'builder', icon: HammerIcon, tile: 'bg-lime' },
  { role: 'both', icon: SparkleIcon, tile: 'bg-primary text-primary-foreground' },
] as const

const roleKey = { user: 'roleUser', builder: 'roleBuilder', both: 'roleBoth' } as const

export function RolePicker({ value, onChange }: { value: Role | null; onChange: (r: Role) => void }) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" className="grid gap-3">
      {roleCards.map(({ role, icon: Icon, tile }) => (
        <m.button
          key={role}
          type="button"
          role="radio"
          aria-checked={value === role}
          onClick={() => onChange(role)}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors',
            value === role ? 'border-ink bg-card' : 'border-border bg-card hover:border-ink/30',
          )}
        >
          <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', tile)}>
            <Icon weight="duotone" className="size-6" />
          </span>
          <span>
            <span className="block font-heading text-lg font-bold">{t(`onboarding.${roleKey[role]}`)}</span>
            <span className="text-sm text-muted-foreground">{t(`onboarding.${roleKey[role]}Body`)}</span>
          </span>
        </m.button>
      ))}
    </div>
  )
}

/** Builders can opt in to show their avatar on the landing page. */
export function PublicToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border bg-card p-4">
      <div className="space-y-1">
        <Label htmlFor="public" className="font-bold">
          {t('onboarding.public')}
        </Label>
        <p className="text-sm text-muted-foreground">{t('onboarding.publicBody')}</p>
      </div>
      <Switch id="public" checked={value} onCheckedChange={onChange} className="mt-1" />
    </div>
  )
}

/** The two onboarding steps. Saving creates the profile; the auth store then has a profile. */
export function OnboardingForm() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState(() => user?.displayName ?? user?.email?.split('@')[0] ?? '')
  const [country, setCountry] = useState(guessCountry)
  const [stack, setStack] = useState<string[]>([])
  const [link, setLink] = useState('')
  const [isPublic, setPublic] = useState(false)
  const [saving, setSaving] = useState(false)

  const builder = role === 'builder' || role === 'both'
  const nameOk = name.trim().length >= 1 && name.trim().length <= 60 && !isReservedName(name)
  const linkOk = !link.trim() || /^https:\/\/\S+\.\S+$/.test(link.trim())

  async function finish(e: FormEvent) {
    e.preventDefault()
    if (!role || !nameOk || !linkOk) return
    setSaving(true)
    try {
      await createProfile(
        {
          name: name.trim(),
          role,
          country,
          stack: builder ? stack : [],
          link: builder ? link.trim() : '',
          lang: currentLanguage(),
          public: builder && isPublic,
        },
        getSource(),
      )
      toast.success(t('onboarding.welcome', { name: name.trim() }))
    } catch (err) {
      console.error(err)
      toast.error(t('onboarding.error'))
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 pr-8">
        <span className="text-sm font-bold text-primary">{t('onboarding.step', { n: step })}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <m.div
            className="h-full rounded-full bg-primary"
            animate={{ width: step === 1 ? '50%' : '100%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          <h2 className="mt-6 mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t(step === 1 ? 'onboarding.q1' : 'onboarding.q2')}
          </h2>
          {step === 1 ? (
            <div className="space-y-6">
              <RolePicker value={role} onChange={setRole} />
              <Button size="lg" className="w-full" disabled={!role} onClick={() => setStep(2)}>
                {t('onboarding.next')}
              </Button>
            </div>
          ) : (
            <form onSubmit={finish} noValidate className="space-y-6">
              <Field id="name" label={t('onboarding.name')} error={isReservedName(name) ? t('onboarding.nameReserved') : null}>
                <Input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
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
                      inputMode="url"
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
              <div className="flex gap-3">
                <Button type="button" size="lg" variant="outline" onClick={() => setStep(1)}>
                  {t('onboarding.back')}
                </Button>
                <Button type="submit" size="lg" variant="flame" className="flex-1" loading={saving} disabled={!nameOk || !linkOk}>
                  {t(saving ? 'onboarding.saving' : 'onboarding.finish')}
                </Button>
              </div>
            </form>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  )
}

/** /onboarding (and /signin): open the sign-in dialog, then go on to `next`. */
export function OnboardingPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (user && profile) return <Navigate to={next} replace />
  return <SignInPrompt />
}

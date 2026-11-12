import { HammerIcon, LightbulbIcon, SparkleIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useSearchParams } from '@/lib/nav'
import { toast } from 'sonner'

import { Chips, Field, FormCard } from '@/components/field'
import { Page } from '@/components/layout'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { currentLanguage } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { createProfile } from '@/lib/data'
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
        <motion.button
          key={role}
          type="button"
          role="radio"
          aria-checked={value === role}
          onClick={() => onChange(role)}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors',
            value === role ? 'border-ink bg-background' : 'border-border bg-card hover:border-ink/30',
          )}
        >
          <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', tile)}>
            <Icon weight="duotone" className="size-6" />
          </span>
          <span>
            <span className="block font-heading text-lg font-bold">{t(`onboarding.${roleKey[role]}`)}</span>
            <span className="text-sm text-muted-foreground">{t(`onboarding.${roleKey[role]}Body`)}</span>
          </span>
        </motion.button>
      ))}
    </div>
  )
}

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const { user, profile, loading } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState(() => user?.displayName ?? user?.email?.split('@')[0] ?? '')
  const [country, setCountry] = useState(currentLanguage() === 'el' ? 'Ελλάδα' : '')
  const [stack, setStack] = useState<string[]>([])
  const [link, setLink] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(next)}`} replace />
  if (profile && !saving) return <Navigate to={next} replace />

  const builder = role === 'builder' || role === 'both'
  const nameOk = name.trim().length >= 1 && name.trim().length <= 60
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
          country: country.trim().slice(0, 60),
          stack: builder ? stack : [],
          link: builder ? link.trim() : '',
          lang: currentLanguage(),
        },
        getSource(),
      )
      navigate(next, { replace: true })
    } catch (err) {
      console.error(err)
      toast.error(t('onboarding.error'))
      setSaving(false)
    }
  }

  return (
    <Page narrow>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-primary">{t('onboarding.step', { n: step })}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: step === 1 ? '50%' : '100%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t(step === 1 ? 'onboarding.q1' : 'onboarding.q2')}
          </h1>
          <FormCard>
            {step === 1 ? (
              <div className="space-y-6">
                <RolePicker value={role} onChange={setRole} />
                <Button size="lg" className="w-full" disabled={!role} onClick={() => setStep(2)}>
                  {t('onboarding.next')}
                </Button>
              </div>
            ) : (
              <form onSubmit={finish} noValidate className="space-y-6">
                <Field id="name" label={t('onboarding.name')}>
                  <Input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field id="country" label={t('onboarding.country')}>
                  <Input
                    id="country"
                    value={country}
                    maxLength={60}
                    placeholder={t('onboarding.countryPlaceholder')}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </Field>
                {builder && (
                  <>
                    <Field label={t('onboarding.stack')}>
                      <Chips
                        options={stacks}
                        value={stack}
                        label={(s) => s}
                        onChange={(s) =>
                          setStack((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
                        }
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
                  </>
                )}
                <div className="flex gap-3">
                  <Button type="button" size="lg" variant="outline" onClick={() => setStep(1)}>
                    {t('onboarding.back')}
                  </Button>
                  <Button type="submit" size="lg" variant="flame" className="flex-1" disabled={saving || !nameOk || !linkOk}>
                    {t(saving ? 'onboarding.saving' : 'onboarding.finish')}
                  </Button>
                </div>
              </form>
            )}
          </FormCard>
        </motion.div>
      </AnimatePresence>
    </Page>
  )
}

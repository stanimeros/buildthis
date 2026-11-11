import { CheckCircleIcon, HammerIcon, LightbulbIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { currentLanguage } from '@/i18n'
import { db, track } from '@/lib/firebase'
import { getSource } from '@/lib/source'
import { cn } from '@/lib/utils'

export type SignupType = 'problem' | 'builder'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type Status = 'idle' | 'sending' | 'done' | 'error'

const types = [
  { value: 'problem', icon: LightbulbIcon, label: 'signup.typeProblem' },
  { value: 'builder', icon: HammerIcon, label: 'signup.typeBuilder' },
] as const

// Confetti-ish burst behind the success check.
function Burst() {
  const colors = ['bg-primary', 'bg-lime', 'bg-sky', 'bg-ink']
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        return (
          <motion.span
            key={i}
            className={cn('absolute size-2 rounded-full', colors[i % colors.length])}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 70, y: Math.sin(angle) * 70, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          />
        )
      })}
    </div>
  )
}

export function SignupForm({
  type,
  onTypeChange,
}: {
  type: SignupType
  onTypeChange: (type: SignupType) => void
}) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [text, setText] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [emailError, setEmailError] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed) || trimmed.length > 254) {
      setEmailError(true)
      return
    }
    setEmailError(false)
    setStatus('sending')
    try {
      await addDoc(collection(db, 'signups'), {
        email: trimmed,
        type,
        text: text.trim().slice(0, 1000),
        lang: currentLanguage(),
        source: getSource(),
        createdAt: serverTimestamp(),
      })
      track('sign_up', { method: 'waitlist', type })
      setStatus('done')
      setEmail('')
      setText('')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  return (
    <section id="signup" className="relative scroll-mt-24 px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="relative mx-auto max-w-xl"
      >
        <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rounded-[2rem] bg-ink" />
        <div className="relative rounded-[2rem] border-2 border-ink bg-card p-6 sm:p-10">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('signup.title')}</h2>
            <p className="mt-2 text-muted-foreground">{t('signup.subtitle')}</p>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {status === 'done' ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-10 text-center"
              >
                <div className="relative">
                  <Burst />
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 12 }}
                  >
                    <CheckCircleIcon weight="fill" className="size-16 text-primary" />
                  </motion.div>
                </div>
                <p className="font-heading text-xl font-bold">{t('signup.success')}</p>
                <Button variant="outline" onClick={() => setStatus('idle')}>
                  {t('signup.another')}
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                noValidate
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-8 space-y-5"
              >
                <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
                  {types.map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={type === value}
                      onClick={() => onTypeChange(value)}
                      className={cn(
                        'relative flex items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-[13px] font-bold whitespace-nowrap transition-colors sm:gap-2 sm:px-3 sm:text-sm',
                        type === value ? 'text-background' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {type === value && (
                        <motion.span
                          layoutId="type-pill"
                          className="absolute inset-0 rounded-full bg-ink"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      <Icon weight="duotone" className={cn('relative size-5', type === value && 'text-lime')} />
                      <span className="relative">{t(label)}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold">
                    {t('signup.email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('signup.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={emailError}
                    required
                  />
                  {emailError && <p className="text-sm text-destructive">{t('signup.invalidEmail')}</p>}
                </div>

                <div className="space-y-2">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Label htmlFor="text" className="font-bold">
                        {t(type === 'problem' ? 'signup.textProblem' : 'signup.textBuilder')}
                      </Label>
                    </motion.div>
                  </AnimatePresence>
                  <Textarea
                    id="text"
                    rows={type === 'problem' ? 4 : 2}
                    maxLength={1000}
                    placeholder={t(
                      type === 'problem' ? 'signup.textProblemPlaceholder' : 'signup.textBuilderPlaceholder',
                    )}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>

                {status === 'error' && <p className="text-sm text-destructive">{t('signup.error')}</p>}

                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button type="submit" size="lg" variant="flame" className="group w-full" disabled={status === 'sending'}>
                    {t(status === 'sending' ? 'signup.submitting' : 'signup.submit')}
                    <PaperPlaneTiltIcon
                      weight="fill"
                      className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:rotate-12"
                    />
                  </Button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  )
}

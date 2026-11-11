import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { CheckCircle2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <section id="signup" className="mx-auto max-w-xl scroll-mt-20 px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl">{t('signup.title')}</CardTitle>
          <CardDescription>{t('signup.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'done' ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle2 className="size-10 text-primary" />
              <p className="font-medium">{t('signup.success')}</p>
              <Button variant="outline" onClick={() => setStatus('idle')}>
                {t('signup.another')}
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5" noValidate>
              <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                {(['problem', 'builder'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={type === value}
                    onClick={() => onTypeChange(value)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      type === value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t(value === 'problem' ? 'signup.typeProblem' : 'signup.typeBuilder')}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('signup.email')}</Label>
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
                <Label htmlFor="text">
                  {t(type === 'problem' ? 'signup.textProblem' : 'signup.textBuilder')}
                </Label>
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

              <Button type="submit" className="w-full" disabled={status === 'sending'}>
                {t(status === 'sending' ? 'signup.submitting' : 'signup.submit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

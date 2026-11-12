import { PlusIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from '@/lib/nav'

import { Avatar } from '@/components/avatar'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { languages, setLanguage } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const labels = { en: 'EN', el: 'ΕΛ' } as const

export function Header() {
  const { t, i18n } = useTranslation()
  const { user, profile, loading } = useAuth()
  const lang = i18n.language === 'el' ? 'el' : 'en'

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="sticky top-3 z-20 px-4"
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 rounded-full border bg-card/80 py-2 pr-2 pl-4 shadow-[0_8px_30px_-12px_oklch(0.18_0.01_60/0.25)] backdrop-blur-md">
        <Logo />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div role="radiogroup" aria-label={t('nav.language')} className="flex rounded-full bg-muted p-1">
            {languages.map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={lang === l}
                onClick={() => setLanguage(l)}
                className={cn(
                  'relative rounded-full px-2.5 py-1 text-xs font-bold transition-colors sm:px-3',
                  lang === l ? 'text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {lang === l && (
                  <motion.span
                    layoutId="lang-pill"
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative">{labels[l]}</span>
              </button>
            ))}
          </div>
          <Button variant="flame" size="icon" className="sm:hidden" aria-label={t('nav.post')} asChild>
            <Link to="/new">
              <PlusIcon weight="bold" />
            </Link>
          </Button>
          <Button variant="flame" className="hidden sm:inline-flex" asChild>
            <Link to="/new">
              <PlusIcon weight="bold" />
              {t('nav.post')}
            </Link>
          </Button>
          {loading ? (
            <span className="size-10 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <Link
              to="/me"
              aria-label={t('nav.me')}
              className="rounded-full ring-2 ring-transparent transition hover:ring-primary"
            >
              <Avatar
                name={profile?.name ?? user.displayName ?? user.email ?? '?'}
                photo={profile?.photo ?? user.photoURL ?? ''}
                className="size-10 text-base"
              />
            </Link>
          ) : (
            <Button asChild>
              <Link to="/signin">{t('nav.signIn')}</Link>
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  )
}

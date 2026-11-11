import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { currentLanguage, languages } from '@/i18n'
import { cn } from '@/lib/utils'

const labels = { en: 'EN', el: 'ΕΛ' } as const

export function Header() {
  const { t, i18n } = useTranslation()
  const lang = currentLanguage()

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="sticky top-3 z-20 px-4"
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border bg-card/80 py-2 pr-2 pl-4 shadow-[0_8px_30px_-12px_oklch(0.18_0.01_60/0.25)] backdrop-blur-md">
        <Logo />
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label={t('nav.language')} className="flex rounded-full bg-muted p-1">
            {languages.map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={lang === l}
                onClick={() => i18n.changeLanguage(l)}
                className={cn(
                  'relative rounded-full px-3 py-1 text-xs font-bold transition-colors',
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
          <Button className="hidden sm:inline-flex" asChild>
            <a href="#signup">{t('nav.join')}</a>
          </Button>
        </div>
      </div>
    </motion.header>
  )
}

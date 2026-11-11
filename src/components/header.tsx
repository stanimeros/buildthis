import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { currentLanguage } from '@/i18n'
import { applyTheme, getTheme } from '@/lib/theme'

export function Header() {
  const { t, i18n } = useTranslation()
  const [theme, setTheme] = useState(getTheme)
  const lang = currentLanguage()

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <a href="/" className="font-heading text-lg font-semibold tracking-tight">
          Build<span className="text-primary">This</span>
        </a>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('nav.language')}
            onClick={() => i18n.changeLanguage(lang === 'en' ? 'el' : 'en')}
          >
            {lang === 'en' ? 'ΕΛ' : 'EN'}
          </Button>
          <Button variant="ghost" size="icon" aria-label={t('nav.theme')} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
          <Button size="sm" className="ml-2 hidden sm:inline-flex" asChild>
            <a href="#signup">{t('nav.join')}</a>
          </Button>
        </div>
      </div>
    </header>
  )
}

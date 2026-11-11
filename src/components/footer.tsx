import { useTranslation } from 'react-i18next'

import { Logo } from '@/components/logo'

const year = new Date().getFullYear()

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row">
        <Logo />
        <p className="text-center">{t('footer.privacy')}</p>
        <p>© {year}</p>
      </div>
    </footer>
  )
}

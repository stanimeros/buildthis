import { useTranslation } from 'react-i18next'

import { Logo } from '@/components/logo'

const year = new Date().getFullYear()

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="mt-24 border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row">
        <Logo />
        <p className="text-center">{t('footer.tagline')}</p>
        <p>
          {t('footer.poweredBy')}{' '}
          <a
            href="https://stanimeros.com"
            target="_blank"
            rel="noopener"
            className="font-bold text-foreground underline decoration-lime decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
          >
            stanimeros.com
          </a>{' '}
          · © {year}
        </p>
      </div>
    </footer>
  )
}

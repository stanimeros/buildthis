import { useTranslation } from 'react-i18next'

const year = new Date().getFullYear()

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <p>{t('footer.privacy')}</p>
        <p>© {year} BuildThis</p>
      </div>
    </footer>
  )
}

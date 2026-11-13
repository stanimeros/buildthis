import type { Language } from '@/i18n'
import { Island } from '@/islands/island'
import { AuthDialog } from '@/components/auth-dialog'
import { Header } from '@/components/header'
import { Toaster } from '@/components/ui/sonner'

export default function HeaderIsland({ lang }: { lang: Language }) {
  return (
    <Island lang={lang}>
      <Header />
      <Toaster position="bottom-right" />
      <AuthDialog />
    </Island>
  )
}

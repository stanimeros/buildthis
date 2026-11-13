import type { Language } from '@/i18n'
import { Island } from '@/islands/island'
import { Footer } from '@/components/footer'

export default function FooterIsland({ lang }: { lang: Language }) {
  return (
    <Island lang={lang}>
      <Footer />
    </Island>
  )
}

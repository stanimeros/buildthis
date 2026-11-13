import type { Language } from '@/i18n'
import { Island } from '@/islands/island'
import { HomePage } from '@/views/home'

export default function HomeIsland({ lang }: { lang: Language }) {
  return (
    <Island lang={lang}>
      <HomePage />
    </Island>
  )
}

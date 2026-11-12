import { Island } from '@/islands/island'
import { HomePage } from '@/views/home'

export default function HomeIsland() {
  return (
    <Island ssr>
      <HomePage />
    </Island>
  )
}

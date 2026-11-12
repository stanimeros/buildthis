import { Island } from '@/islands/island'
import { Header } from '@/components/header'
import { Toaster } from '@/components/ui/sonner'

export default function HeaderIsland() {
  return (
    <Island ssr>
      <Header />
      <Toaster position="bottom-center" />
    </Island>
  )
}

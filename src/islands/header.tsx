import { Island } from '@/islands/island'
import { AuthDialog } from '@/components/auth-dialog'
import { Header } from '@/components/header'
import { Toaster } from '@/components/ui/sonner'

export default function HeaderIsland() {
  return (
    <Island ssr>
      <Header />
      <Toaster position="bottom-right" />
      <AuthDialog />
    </Island>
  )
}

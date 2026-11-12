import { Island } from '@/islands/island'
import { MePage } from '@/views/me'

export default function MeIsland() {
  return (
    <Island auth>
      <MePage />
    </Island>
  )
}

import { Island } from '@/islands/island'
import { SolutionFormPage } from '@/views/solution-form'

export default function SolutionFormIsland() {
  return (
    <Island auth>
      <SolutionFormPage />
    </Island>
  )
}

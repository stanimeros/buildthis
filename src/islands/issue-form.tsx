import { Island } from '@/islands/island'
import { IssueFormPage } from '@/views/issue-form'

export default function IssueFormIsland() {
  return (
    <Island auth>
      <IssueFormPage />
    </Island>
  )
}

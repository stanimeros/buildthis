import { FlagIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useConfirm } from '@/components/confirm'
import { useRequireSignIn } from '@/components/require-auth'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { report, type Reportable } from '@/lib/data'
import { useReported } from '@/lib/hooks'
import { cn } from '@/lib/utils'

/** "Report" for a problem or solution. Never shows how many reports there are. */
export function ReportButton({
  coll,
  id,
  authorId,
  compact,
}: {
  coll: Reportable
  id: string
  authorId: string
  compact?: boolean
}) {
  const { t } = useTranslation()
  const { user, blocked } = useAuth()
  const requireSignIn = useRequireSignIn()
  const reported = useReported(coll, id)
  const [dialog, confirm] = useConfirm()
  const [busy, setBusy] = useState(false)

  async function click(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return requireSignIn()
    const ok = await confirm({
      title: t('report.confirmTitle'),
      description: t('report.confirmBody'),
      confirmLabel: t('report.confirm'),
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      await report(coll, id, authorId)
      toast.success(t('report.thanks'))
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  if (blocked) return null
  const label = t(reported ? 'report.done' : 'report.action')
  return (
    <>
      {dialog}
      {compact ? (
        <button
          type="button"
          onClick={click}
          disabled={reported || busy}
          className={cn('inline-flex items-center gap-1', reported ? 'opacity-60' : 'hover:text-destructive')}
        >
          <FlagIcon weight={reported ? 'fill' : 'regular'} /> {label}
        </button>
      ) : (
        <Button size="lg" variant="ghost" onClick={click} disabled={reported || busy} className="text-muted-foreground">
          <FlagIcon weight={reported ? 'fill' : 'bold'} />
          {label}
        </Button>
      )}
    </>
  )
}

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Options {
  title: string
  description?: string
  confirmLabel: string
  destructive?: boolean
}

/** `const [dialog, confirm] = useConfirm()` → render `dialog`, then `if (!(await confirm({…}))) return`. */
export function useConfirm() {
  const { t } = useTranslation()
  const [options, setOptions] = useState<Options | null>(null)
  const resolver = useRef<(ok: boolean) => void>(() => {})

  function confirm(opts: Options) {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }

  function close(ok: boolean) {
    resolver.current(ok)
    setOptions(null)
  }

  const dialog = (
    <AlertDialog open={!!options} onOpenChange={(open) => !open && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl font-bold">{options?.title}</AlertDialogTitle>
          {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction variant={options?.destructive ? 'destructive' : 'flame'} onClick={() => close(true)}>
            {options?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return [dialog, confirm] as const
}

import { useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
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
  /** ask for a value first (e.g. the password); `confirm` then resolves with it */
  input?: { label: string; type?: string; autoComplete?: string }
}

/**
 * `const [dialog, confirm] = useConfirm()` → render `dialog`, then `if (!(await confirm({…}))) return`.
 * With `input`, the resolved value is what was typed (never empty).
 */
export function useConfirm() {
  const { t } = useTranslation()
  const [options, setOptions] = useState<Options | null>(null)
  const [value, setValue] = useState('')
  const resolver = useRef<(ok: boolean | string) => void>(() => {})

  function confirm(opts: Options) {
    setOptions(opts)
    setValue('')
    return new Promise<boolean | string>((resolve) => {
      resolver.current = resolve
    })
  }

  function close(ok: boolean) {
    resolver.current(ok && options?.input ? value : ok)
    setOptions(null)
  }

  const dialog = (
    <AlertDialog open={!!options} onOpenChange={(open) => !open && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl font-bold">{options?.title}</AlertDialogTitle>
          {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {options?.input && (
          <Input
            type={options.input.type ?? 'text'}
            autoComplete={options.input.autoComplete}
            aria-label={options.input.label}
            placeholder={options.input.label}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant={options?.destructive ? 'destructive' : 'flame'}
            disabled={!!options?.input && !value}
            onClick={() => close(true)}
          >
            {options?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return [dialog, confirm] as const
}

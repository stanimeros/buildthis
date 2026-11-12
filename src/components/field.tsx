import type { Icon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function Field({
  id,
  label,
  hint,
  error,
  count,
  children,
}: {
  id?: string
  label: string
  hint?: string
  error?: string | null
  count?: [number, number]
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="font-bold">
          {label}
        </Label>
        {count && (
          <span className={cn('text-xs tabular-nums text-muted-foreground', count[0] > count[1] && 'text-destructive')}>
            {count[0]}/{count[1]}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
  icon,
}: {
  options: readonly T[]
  value: T | T[]
  onChange: (v: T) => void
  label: (v: T) => string
  /** same look as the board's category filter */
  icon?: (v: T) => Icon
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v)
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const Icon = icon?.(o)
        const active = selected(o)
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
              active ? 'border-ink bg-ink text-background' : 'bg-card hover:border-ink/30',
            )}
          >
            {Icon && <Icon weight={active ? 'fill' : 'duotone'} className={cn('size-4', active && 'text-lime')} />}
            {label(o)}
          </button>
        )
      })}
    </div>
  )
}

/** A card wrapping a form, with the offset ink shadow. */
export function FormCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative mt-8">
      <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 rounded-[2rem] bg-ink sm:translate-x-3 sm:translate-y-3" />
      <div className="relative rounded-[2rem] border-2 border-ink bg-card p-6 sm:p-8">{children}</div>
    </div>
  )
}

import { CaretUpDownIcon, CheckIcon, GlobeHemisphereEastIcon, MapPinIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { countryName, countryOptions, flag } from '@/lib/countries'
import { cn } from '@/lib/utils'

/** Searchable country picker (shadcn combobox). Names in the UI language, Greece & Cyprus first. */
export function CountrySelect({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  className,
  pill,
  label,
}: {
  id?: string
  value: string
  onChange: (code: string) => void
  /** shown when empty; in `pill` mode it is also the "clear" option */
  placeholder: string
  invalid?: boolean
  className?: string
  /** compact rounded-full style for filter bars */
  pill?: boolean
  /** accessible name when there is no visible <label> */
  label?: string
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const options = useMemo(
    () => countryOptions(i18n.language).map((code) => ({ code, name: countryName(code, i18n.language) })),
    [i18n.language],
  )
  const selected = options.find((o) => o.code === value)

  function pick(code: string) {
    onChange(code)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          aria-label={label}
          className={cn(
            'flex items-center gap-2 border bg-background text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive',
            pill
              ? cn(
                  'h-10 rounded-full px-3.5 text-sm font-semibold',
                  value ? 'border-ink bg-ink text-background' : 'hover:border-ink/30',
                )
              : 'h-12 w-full rounded-xl border-input px-4 text-base md:text-sm',
            className,
          )}
        >
          {pill && !value && <MapPinIcon weight="duotone" className="hidden size-4 shrink-0 sm:block" />}
          {selected ? (
            <>
              <span aria-hidden>{flag(selected.code)}</span>
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className={cn('truncate', !pill && 'text-muted-foreground')}>{placeholder}</span>
          )}
          <CaretUpDownIcon weight="bold" className="ml-auto size-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder={t('place.search')} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{t('place.noMatch')}</CommandEmpty>
            <CommandGroup>
              {pill && (
                <CommandItem value="__all__" keywords={[placeholder]} onSelect={() => pick('')}>
                  <GlobeHemisphereEastIcon weight="duotone" />
                  {placeholder}
                  {!value && <CheckIcon weight="bold" className="ml-auto" />}
                </CommandItem>
              )}
              {options.map(({ code, name }) => (
                <CommandItem key={code} value={code} keywords={[name]} onSelect={() => pick(code)}>
                  <span aria-hidden>{flag(code)}</span>
                  {name}
                  {value === code && <CheckIcon weight="bold" className="ml-auto" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

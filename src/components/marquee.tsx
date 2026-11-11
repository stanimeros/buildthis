import { LightbulbIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

const ids = ['1', '2', '3', '4', '5', '6', '7', '8']

export function Marquee() {
  const { t } = useTranslation()
  const items = ids.map((id) => t(`marquee.${id}`))

  return (
    <div className="group relative -rotate-1 overflow-hidden border-y bg-ink py-4 text-background [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee gap-3 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[...items, ...items].map((text, i) => (
          <span
            key={i}
            aria-hidden={i >= items.length}
            className="flex items-center gap-2 rounded-full border border-background/15 px-4 py-1.5 text-sm font-semibold whitespace-nowrap"
          >
            <LightbulbIcon weight="duotone" className="size-4 text-lime" />
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}

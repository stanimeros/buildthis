import {
  BriefcaseIcon, BusIcon, ChatsCircleIcon, DotsThreeCircleIcon, ForkKnifeIcon, GlobeHemisphereEastIcon,
  GraduationCapIcon, HeartbeatIcon, HouseIcon, type Icon, LightningIcon, SquaresFourIcon, UsersThreeIcon,
  WalletIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { countryName, flag } from '@/lib/countries'
import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

export const categoryIcons: Record<Category | 'all', Icon> = {
  all: SquaresFourIcon,
  productivity: LightningIcon,
  finance: WalletIcon,
  health: HeartbeatIcon,
  family: UsersThreeIcon,
  education: GraduationCapIcon,
  housing: HouseIcon,
  transport: BusIcon,
  food: ForkKnifeIcon,
  social: ChatsCircleIcon,
  work: BriefcaseIcon,
  other: DotsThreeCircleIcon,
}

/** One badge shape for category, place, etc. */
export function Badge({
  icon,
  children,
  className,
  size = 'sm',
}: {
  icon: ReactNode
  children: ReactNode
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        size === 'sm' ? 'h-6 px-2.5 text-xs [&_svg]:size-3.5' : 'h-8 px-3 text-sm [&_svg]:size-4',
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}

export function CategoryBadge({ category, size }: { category: Category; size?: 'sm' | 'md' }) {
  const { t } = useTranslation()
  const Icon = categoryIcons[category]
  return (
    <Badge size={size} icon={<Icon weight="duotone" />} className="bg-muted text-foreground/80">
      {t(`categories.${category}`)}
    </Badge>
  )
}

/** "🇬🇷 Greece" or "🌍 Anywhere". */
export function PlaceBadge({ country, size }: { country: string; size?: 'sm' | 'md' }) {
  const { t, i18n } = useTranslation()
  return (
    <Badge
      size={size}
      className="bg-sky/35 text-foreground/80"
      icon={
        country ? (
          <span aria-hidden className="text-[1.1em] leading-none">
            {flag(country)}
          </span>
        ) : (
          <GlobeHemisphereEastIcon weight="duotone" />
        )
      }
    >
      {country ? countryName(country, i18n.language) : t('place.anywhere')}
    </Badge>
  )
}

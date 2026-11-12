import { ArrowFatUpIcon } from '@phosphor-icons/react'
import { Link } from '@/lib/nav'

export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:-rotate-6">
        <ArrowFatUpIcon weight="fill" className="size-4.5" />
      </span>
      BuildThis
    </Link>
  )
}

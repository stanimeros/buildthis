import type { ReactNode } from 'react'

/** Standard page shell for inner pages. */
export function Page({ title, subtitle, children, narrow }: {
  title?: string
  subtitle?: string
  children?: ReactNode
  narrow?: boolean
}) {
  return (
    <div className={narrow ? 'mx-auto max-w-xl px-4 pt-12' : 'mx-auto max-w-3xl px-4 pt-12'}>
      {title && <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>}
      {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
      {children}
    </div>
  )
}

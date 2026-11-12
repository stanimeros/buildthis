import { cn } from '@/lib/utils'

const tones = ['bg-lime text-ink', 'bg-sky text-ink', 'bg-primary text-primary-foreground', 'bg-ink text-background']

export function Avatar({ name, photo, className }: { name: string; photo?: string; className?: string }) {
  const tone = tones[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % tones.length]
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        referrerPolicy="no-referrer"
        className={cn('size-6 shrink-0 rounded-full object-cover', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-[0.65em] font-bold', tone, className)}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

import { cn } from '@/lib/utils'

const delays = ['', '[animation-delay:120ms]', '[animation-delay:240ms]']

/**
 * The app's one loading animation: three bouncing dots, in CSS so it also runs before hydration
 * (src/components/loading.astro has the same markup). Takes the text color and scales with font size.
 */
export function Dots({ className }: { className?: string }) {
  return (
    <span data-spinner aria-hidden className={cn('inline-flex items-center gap-[0.3em] py-[0.4em]', className)}>
      {delays.map((d) => (
        <span key={d} className={cn('size-[0.4em] animate-dot rounded-full bg-current', d)} />
      ))}
    </span>
  )
}

/** Page or section loading state. */
export function Spinner() {
  return (
    <div className="flex justify-center py-24 text-primary" role="status" aria-live="polite">
      <Dots className="text-[25px]" />
    </div>
  )
}

import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export type PageContainerProps = ComponentProps<'main'> & {
  /** Widen to the fluid layout (calendar/dashboard-style pages). Omit for the standard shell. */
  fluid?: boolean
}

/**
 * The single source of the page shell. Every page wraps its content in this — a centered `<main>`
 * at the standard `max-w-6xl` width with the standard gap + responsive padding — so pages can't
 * drift apart. Wide pages pass `fluid`. Presentational and locale-agnostic; not a client component.
 *
 * // Por quê: a `<main>` remounts on every real navigation (new route = new DOM node), so a plain
 * // one-shot `animate-in` here — no JS, no client component — gives every page the same quiet
 * // arrival instead of a hard cut. It does NOT replay on an in-place server re-render
 * // (revalidation keeps the same DOM node), so mutations never re-trigger it. `motion-safe:` opts
 * // out under `prefers-reduced-motion`.
 */
export function PageContainer({
  fluid = false,
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-1 flex-col',
        fluid ? 'max-w-[110rem] gap-5 p-4 sm:p-6 lg:p-8' : 'max-w-6xl gap-8 p-6 sm:p-10',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:ease-out',
        className
      )}
      {...props}
    >
      {children}
    </main>
  )
}

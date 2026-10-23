import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { PAGE_GUTTER, PAGE_WIDTH } from './layout'

const ROW_WIDTHS = ['w-3/4', 'w-2/3', 'w-5/6', 'w-1/2', 'w-3/5'] as const

/** A lista enquanto os dados do navegador ainda não foram lidos (também o HTML estático e o offline). */
export function TodoListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {ROW_WIDTHS.map((width) => (
        <div key={width} className="flex items-center gap-3 px-2">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className={`h-4 ${width}`} />
        </div>
      ))}
    </div>
  )
}

/** A casca da tela inteira para o Suspense e o primeiro render. */
export function TodoSkeleton() {
  return (
    <main
      className={cn(
        'flex flex-1 flex-col gap-3 pt-5 pb-36 sm:gap-4 sm:pt-8 sm:pb-12 lg:pt-10',
        PAGE_WIDTH,
        PAGE_GUTTER
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-8 w-56" />
      <TodoListSkeleton />
    </main>
  )
}

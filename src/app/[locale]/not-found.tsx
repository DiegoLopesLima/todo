import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export default function NotFoundPage() {
  const t = useTranslations('NotFoundPage')

  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-bold text-7xl text-primary tracking-tight sm:text-8xl">404</p>

      <h1 className="mt-6 text-balance font-semibold text-2xl tracking-tight sm:text-3xl">
        {t('title')}
      </h1>

      <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">{t('description')}</p>

      <Link href="/" className={cn(buttonVariants({ size: 'lg' }), 'mt-8 inline-flex gap-2')}>
        <Icon icon="lucide:arrow-left" className="size-4" aria-hidden="true" />
        {t('back_home')}
      </Link>
    </section>
  )
}

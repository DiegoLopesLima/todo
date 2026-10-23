import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'
import { APP_NAME, THEME_COLOR } from '@/constants/app'
import { routing } from '@/i18n/routing'
import { Providers } from '@/providers'
import '../globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

/**
 * Base document title: pages that set their own `title` (via `generateMetadata`) get it suffixed
 * with the brand; everything else falls back to the brand alone. Sourced from {@link APP_NAME} so
 * the name lives in exactly one place.
 */
export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  // App instalado no iOS: abre em tela cheia, com o ícone PNG (o iOS ignora o SVG do manifesto).
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
  icons: { apple: '/api/pwa-icon/192' },
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  // Por quê: `cover` deixa a página usar a área inteira (inclusive sob o entalhe); os espaçamentos
  // usam `env(safe-area-inset-*)` onde isso importa (a barra de criar tarefa na base do celular).
  viewportFit: 'cover',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Por quê: sem isto o next-intl lê o locale dos headers da requisição e a árvore inteira vira
  // dinâmica; com `generateStaticParams` + `setRequestLocale` (aqui e em cada page), as páginas
  // sem dado por requisição são pré-renderizadas por locale.
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <div className="flex flex-1 flex-col">{children}</div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

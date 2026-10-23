import type { routing } from '@/i18n/routing'

/** Copy of the last-resort error screen, per locale. */
export interface GlobalErrorCopy {
  /** The `lang` of the `<html>` this copy renders in. */
  locale: string
  title: string
  description: string
  retry: string
  /** `{digest}` is replaced with Next's error digest. */
  reference: string
}

/**
 * Own dictionary, outside next-intl on purpose: `global-error.tsx` renders when the root layout
 * itself crashed, which is exactly where the i18n provider lives — so it can't use it. A test
 * keeps this in step with `routing.locales`.
 */
export const GLOBAL_ERROR_COPY: Record<(typeof routing.locales)[number], GlobalErrorCopy> = {
  'pt-BR': {
    locale: 'pt-BR',
    title: 'Algo deu errado',
    description: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    retry: 'Tentar novamente',
    reference: 'Referência: {digest}',
  },
  en: {
    locale: 'en',
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again in a moment.',
    retry: 'Try again',
    reference: 'Reference: {digest}',
  },
}

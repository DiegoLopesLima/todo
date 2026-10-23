import type { Locale } from 'date-fns'
import { enUS, ptBR } from 'date-fns/locale'

/** O locale do date-fns para o idioma do app (`pt-BR` ou `en`); o padrão do projeto é o português. */
export function getDateLocale(locale: string): Locale {
  return locale === 'en' ? enUS : ptBR
}

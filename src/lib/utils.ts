import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Junta classes Tailwind resolvendo conflitos (`twMerge`) e condicionais (`clsx`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

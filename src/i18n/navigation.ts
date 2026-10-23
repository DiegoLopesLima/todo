import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/** Locale-aware `Link`, `redirect`, `usePathname` and `useRouter` — use these instead of `next/link`. */
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)

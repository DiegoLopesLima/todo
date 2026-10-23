import { notFound } from 'next/navigation'

// Catch-all for unknown paths within a locale. Rendering this triggers the localized not-found.tsx
// (inside the locale layout's <html>/<body>), instead of falling through to Next.js' internal
// _not-found which has no root layout.
export default function CatchAllPage() {
  notFound()
}

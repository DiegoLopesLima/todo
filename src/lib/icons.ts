import { addCollection } from '@iconify/react'
import circleFlags from './icon-data/circle-flags.json'
import lucide from './icon-data/lucide.json'

// `@iconify/react`'s `<Icon>` fetches unknown icons from api.iconify.design at runtime — a network
// round trip on first paint that flickers/delays every icon. Registering the icons actually used
// ahead of time makes every `<Icon>` render synchronously, no matter where this module is imported
// from first. The JSON files hold only the used SUBSET of each collection (not the full multi-MB
// sets) — see `src/lib/icon-data/` and the icon rule in `lib/CLAUDE.md`.
addCollection(lucide)
addCollection(circleFlags)

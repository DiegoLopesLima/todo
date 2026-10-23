import { iconLoaded } from '@iconify/react'
import './icons'

// Por quê: um id fora do registro offline cai num fetch a api.iconify.design em runtime, e o ícone
// pisca no primeiro paint. Esta lista é o contrato de `lib/icon-data` com o que a UI usa.
const REGISTERED_ICONS = [
  'lucide:sun',
  'lucide:moon',
  'lucide:monitor-smartphone',
  'lucide:languages',
  'lucide:triangle-alert',
  'lucide:refresh-cw',
  'lucide:loader-circle',
  // Módulo de tarefas
  'lucide:check',
  'lucide:chevron-right',
  'lucide:chevron-down',
  'lucide:grip-vertical',
  'lucide:plus',
  'lucide:trash-2',
  'lucide:pencil',
  'lucide:calendar',
  'lucide:calendar-clock',
  'lucide:calendar-x',
  'lucide:repeat',
  'lucide:flag',
  'lucide:ellipsis',
  'lucide:undo-2',
  'lucide:redo-2',
  'lucide:history',
  'lucide:download',
  'lucide:upload',
  'lucide:flame',
  'lucide:party-popper',
  'lucide:search',
  'lucide:x',
  'lucide:list-checks',
  'lucide:indent-increase',
  'lucide:indent-decrease',
  'lucide:arrow-up',
  'lucide:arrow-down',
  'lucide:corner-down-right',
  'lucide:cloud-off',
  'lucide:alarm-clock',
  'lucide:archive',
  'lucide:shield-check',
  'lucide:keyboard',
  'lucide:circle-check',
  'lucide:circle-alert',
  'lucide:trophy',
  'lucide:arrow-down-wide-narrow',
  'lucide:eraser',
  'lucide:sparkles',
  'circle-flags:br',
  'circle-flags:us',
]

describe('icon registry', () => {
  it.each(REGISTERED_ICONS)('has %s available offline', (icon) => {
    expect(iconLoaded(icon)).toBe(true)
  })
})

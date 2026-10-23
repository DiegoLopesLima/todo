'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { isMacPlatform, modKeyLabel } from '@/lib/platform'
import { useModalOpen } from '../state/useModalOpen'

type Shortcut = { keys: string[]; label: string }

type ShortcutsDialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

/** A lista de atalhos de teclado (abre com `?`). */
export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const t = useTranslations('todo.shortcuts')
  const common = useTranslations('common')
  useModalOpen(open)
  const mod = modKeyLabel()
  const alt = isMacPlatform() ? '⌥' : 'Alt'

  const groups: { title: string; items: Shortcut[] }[] = [
    {
      title: t('groups.global'),
      items: [
        { keys: [mod, 'Z'], label: t('undo') },
        { keys: isMacPlatform() ? [mod, '⇧', 'Z'] : [mod, 'Y'], label: t('redo') },
        { keys: ['n'], label: t('newTask') },
        { keys: ['/'], label: t('search') },
        { keys: ['?'], label: t('help') },
      ],
    },
    {
      title: t('groups.add'),
      items: [
        { keys: ['↵'], label: t('submit') },
        { keys: ['!1', '–', '!4'], label: t('priorityText') },
        { keys: [alt, '1', '–', '4'], label: t('priorityAlt') },
        { keys: ['Esc'], label: t('clearField') },
      ],
    },
    {
      title: t('groups.list'),
      items: [
        { keys: ['↑', '↓'], label: t('navigate') },
        { keys: ['←', '→'], label: t('collapse') },
        { keys: ['Space'], label: t('toggle') },
        { keys: ['Enter', 'F2'], label: t('edit') },
        { keys: ['1', '–', '4'], label: t('priority') },
        { keys: ['d'], label: t('details') },
        { keys: ['Del'], label: t('delete') },
        { keys: [alt, '↑↓'], label: t('reorder') },
        { keys: [alt, '←→'], label: t('indent') },
      ],
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5 sm:max-h-[60vh] sm:overflow-y-auto">
          {groups.map((group) => (
            <section key={group.title} className="flex flex-col gap-2">
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {group.title}
              </h3>
              <dl className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
                    <dt>{item.label}</dt>
                    <dd>
                      <KbdGroup>
                        {item.keys.map((key) => (
                          <Kbd key={key}>{key}</Kbd>
                        ))}
                      </KbdGroup>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        {/* Só no celular: o modal é tela cheia e a saída fica ao alcance do polegar, na base. */}
        <DialogFooter className="sm:hidden">
          <DialogClose render={<Button variant="outline" />}>{common('close')}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

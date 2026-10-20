import { type EarnedSticker, STICKERS } from '@tally/core'
import type { IconName, ShelfItem } from '@tally/ui'
import { COPY } from './copy'

const S = COPY.stickers

/**
 * Earned stickers as shelf items (Home's fresh stickers, a game's details), keyed so a pick
 * finds the player whose sticker book to open: `<playerId>|<anything unique>`.
 */
export function shelfItems(
  earned: (EarnedSticker & { game?: string })[],
  nameOf: (id: string) => string,
  keyOf: (e: EarnedSticker, i: number) => string,
): ShelfItem[] {
  return earned.flatMap((e, i) => {
    const k = STICKERS.find((s) => s.id === e.id)
    if (!k) return []
    const name = S.names[e.id]
    const who = nameOf(e.playerId)
    const sub = e.game ? `${who} · ${e.game}` : who
    return [
      {
        key: `${e.playerId}|${keyOf(e, i)}`,
        name,
        sub,
        label: `${S.earnedBy(name, sub)}. ${S.openBook}`,
        sticker: { tone: k.tone, icon: k.icon as IconName, shape: k.shape },
      },
    ]
  })
}

/** The player a shelf item belongs to. */
export const playerOfShelf = (key: string) => key.split('|')[0] ?? ''

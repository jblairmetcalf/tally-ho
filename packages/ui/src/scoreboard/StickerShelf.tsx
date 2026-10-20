import type { IconName } from '../brand/Icon'
import { Sticker, type StickerShape, type StickerTone } from '../brand/Sticker'
import { cx } from '../cx'

export interface ShelfItem {
  key: string
  /** The sticker's name, under it. */
  name: string
  /** A line under that (who, and which game). */
  sub: string
  /** The button's accessible name ("Hat Trick, Kate, Flip 7. Open sticker book"). */
  label: string
  sticker: { tone: StickerTone; icon: IconName; shape: StickerShape }
}

export interface StickerShelfProps {
  items: ShelfItem[]
  /** One scrolling line, edge to edge (Home), instead of wrapping (a game's details). */
  scroll?: boolean
  onPick: (key: string) => void
  /** The group's accessible name. */
  label: string
}

/** A row of earned stickers, each a button (to that player's sticker book). */
export function StickerShelf({ items, scroll = false, onPick, label }: StickerShelfProps) {
  return (
    <ul className={cx('shelf', scroll && 'pills scroll')} aria-label={label}>
      {items.map((it, i) => (
        <li key={it.key}>
          <button
            type="button"
            className="shelf-item"
            onClick={() => onPick(it.key)}
            aria-label={it.label}
          >
            <Sticker {...it.sticker} size={56} tilt={i % 2 ? 5 : -5} />
            <b>{it.name}</b>
            <span>{it.sub}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

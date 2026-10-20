import { type CSSProperties, useEffect, useRef } from 'react'
import { Chip } from '../brand/Chip'
import { Fox } from '../brand/Fox'
import type { IconName } from '../brand/Icon'
import { Sticker, type StickerShape, type StickerTone } from '../brand/Sticker'

export interface PackItem {
  key: string
  /** What's under the sticker: the sticker's name, or the game for the winner's. */
  name: string
  /** Who earned it. */
  who: string
  /** Their first of this sticker. */
  isNew?: boolean
  /** A sticker, or (absent) the winner's own crowned chip. */
  sticker?: { label: string; tone: StickerTone; icon: IconName; shape: StickerShape }
  /** The winner's chip colour (palette index), for the winner's item. */
  color?: number
}

export interface StickerPackProps {
  items: PackItem[]
  /** Torn open yet. */
  open: boolean
  /** How many items have slapped down so far (the caller paces the reveal). */
  shown: number
  onOpen: () => void
  /** Words (the app's copy): the pack's title, its "N stickers inside" line, the hint, the button's name. */
  title: string
  sub: string
  hint: string
  openLabel: string
  /** The tag on the winner's item, and on a first-of-its-kind sticker. */
  winnerLabel: string
  newLabel: string
}

/**
 * The victory sticker pack (the Sticker Club): a foil "Game night pack" to tear open, then the
 * winner's crowned chip and every sticker the game gave out, slapped down one by one. The caller
 * owns the timing and the sounds (`open`, `shown`), so the reveal follows the app's effects.
 */
export function StickerPack({
  items,
  open,
  shown,
  onOpen,
  title,
  sub,
  hint,
  openLabel,
  winnerLabel,
  newLabel,
}: StickerPackProps) {
  // Tearing it open removes the focused button: hand focus to the haul, not to nowhere.
  const haul = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (open) haul.current?.focus({ preventScroll: true })
  }, [open])
  if (!open)
    return (
      <div className="pack-wrap">
        <button type="button" className="pack" onClick={onOpen} aria-label={openLabel}>
          <span className="crimp" aria-hidden="true" />
          <span className="pack-body" aria-hidden="true">
            <span className="pack-fox">
              <Fox crown wink />
            </span>
            <span className="pack-title">{title}</span>
            <span className="pack-sub">{sub}</span>
          </span>
          <span className="crimp" aria-hidden="true" />
        </button>
        <p className="hint">{hint}</p>
      </div>
    )
  return (
    <ul className="haul" aria-live="polite" ref={haul} tabIndex={-1}>
      {items.slice(0, shown).map((it, i) => (
        <li key={it.key} style={{ '--r': `${(i % 2 ? 1 : -1) * (3 + i * 2)}deg` } as CSSProperties}>
          {it.sticker ? (
            // Decorative: its name and owner are the text right under it (announced once).
            <Sticker
              tone={it.sticker.tone}
              icon={it.sticker.icon}
              shape={it.sticker.shape}
              size={66}
            />
          ) : (
            <span className="win-stk">
              <Chip name={it.who} color={it.color ?? 0} size={54} crown />
              <b>{winnerLabel}</b>
            </span>
          )}
          <span className="hi-name">{it.name}</span>
          <span className="hi-who">
            {it.who}
            {it.isNew && <em> · {newLabel}</em>}
          </span>
        </li>
      ))}
    </ul>
  )
}

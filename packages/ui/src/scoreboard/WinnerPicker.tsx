import type { CSSProperties } from 'react'
import { Chip } from '../brand/Chip'
import { Icon } from '../brand/Icon'
import { paletteVar } from '../brand/palette'
import { cx } from '../cx'

export interface WinnerPickerProps {
  players: { id: string; name: string; color: number }[]
  /** The group's accessible name ("Who won?"). */
  label: string
  /**
   * Tapped a player. The pressed button comes along so the caller can burst confetti from it.
   * Each button's accessible name is just the player's name.
   */
  onPick: (id: string, el: HTMLButtonElement) => void
  /**
   * Editing a round: the current winner wears its colour and a check (`aria-pressed`). Leave it
   * out on the live game, where a tap scores straight away.
   */
  selected?: string | null
  className?: string
}

/**
 * "Who won?": one big chip-and-name button per player, for games won outright rather than on
 * points (Uno, Jaipur). Scoring stays one tap, as fast as typing a score.
 */
export function WinnerPicker({ players, label, onPick, selected, className }: WinnerPickerProps) {
  const choosing = selected !== undefined
  return (
    // biome-ignore lint/a11y/useSemanticElements: a grid of big buttons, like PillRow; a fieldset would fight the layout
    <div className={cx('winner-pick', className)} role="group" aria-label={label}>
      {players.map((p) => {
        const on = choosing && selected === p.id
        return (
          <button
            key={p.id}
            type="button"
            className={cx('winner-btn', on && 'on')}
            style={{ '--c': paletteVar(p.color) } as CSSProperties}
            aria-pressed={choosing ? on : undefined}
            onClick={(e) => onPick(p.id, e.currentTarget)}
          >
            <Chip name={p.name} color={p.color} size={34} />
            <span className="n">{p.name}</span>
            {on && <Icon name="check" size={20} stroke={3} className="tick" />}
          </button>
        )
      })}
    </div>
  )
}

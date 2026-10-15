import { PALETTE_SIZE } from '@tally/core'
import type { CSSProperties } from 'react'
import { Icon } from '../brand/Icon'
import { PLAYER_COLOR_NAMES, paletteVar } from '../brand/palette'
import { cx } from '../cx'
import { rovingKey } from './roving'

export interface SwatchesProps {
  /** The chosen palette index. */
  value: number
  onChange: (index: number) => void
  /** The radiogroup's accessible name. */
  label: string
  /** Indices other players already wear: dimmed, still choosable. */
  taken?: number[]
}

/** The eight chip colours as a radiogroup. Arrows move. */
export function Swatches({ value, onChange, label, taken = [] }: SwatchesProps) {
  const indices = Array.from({ length: PALETTE_SIZE }, (_, i) => i)
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {indices.map((i) => {
        const on = i === value
        const isTaken = !on && taken.includes(i)
        const name = PLAYER_COLOR_NAMES[i] ?? `Colour ${i + 1}`
        return (
          // biome-ignore lint/a11y/useSemanticElements: a styled button radio, as the prototype; arrow keys handled
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={isTaken ? `${name} (in use)` : name}
            tabIndex={on || (value < 0 && i === 0) ? 0 : -1}
            className={cx('swatch', isTaken && 'taken')}
            style={{ '--c': paletteVar(i) } as CSSProperties}
            onClick={() => onChange(i)}
            onKeyDown={(e) => {
              const next = rovingKey(e, i, PALETTE_SIZE)
              if (next != null) onChange(next)
            }}
          >
            {on && <Icon name="check" size={20} stroke={3.2} />}
          </button>
        )
      })}
    </div>
  )
}

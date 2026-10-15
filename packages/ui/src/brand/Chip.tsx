import type { CSSProperties } from 'react'
import { paletteVar } from './palette'

export interface ChipProps {
  name: string
  /** A palette index (0–7) or any CSS colour (e.g. `var(--faint)` for a dead heat). */
  color: number | string
  size?: number
  /** Wear a crown that drops in. Change `crownKey` to drop it again (a new leader). */
  crown?: boolean
  crownKey?: string
}

/** The poker-chip avatar: the player's colour, a dashed inner ring and their initial. */
export function Chip({ name, color, size = 36, crown = false, crownKey }: ChipProps) {
  const c = typeof color === 'number' ? paletteVar(color) : color
  return (
    <span
      className="chip"
      style={{ '--c': c, '--s': `${size}px`, width: size, height: size } as CSSProperties}
      aria-hidden="true"
    >
      <b>{(name || '?').trim().charAt(0).toUpperCase()}</b>
      {crown && (
        <svg key={crownKey} className="crown" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"
            fill="currentColor"
            stroke="#13112E"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  )
}

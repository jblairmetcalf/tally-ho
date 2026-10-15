import type { CSSProperties } from 'react'
import { Chip } from '../brand/Chip'
import { Icon } from '../brand/Icon'
import { paletteVar } from '../brand/palette'
import { cx } from '../cx'

export interface GameRowProps {
  name: string
  winner: { name: string; color: number }
  /** ISO timestamp. */
  completedAt: string
  rounds: number
  /** Best first. */
  totals: { id: string; name: string; color: number; total: number; won: boolean }[]
  onClick: () => void
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/** A finished game in Home's "Recent games" and in History. */
export function GameRow({ name, winner, completedAt, rounds, totals, onClick }: GameRowProps) {
  return (
    <button type="button" className="game-row" onClick={onClick}>
      <Chip name={winner.name} color={winner.color} size={42} crown />
      <div className="meta">
        <div className="gname">{name}</div>
        <div className="gsub">
          {winner.name} won · {fmtDate(completedAt)} · {rounds} {rounds === 1 ? 'round' : 'rounds'}
        </div>
        <div className="mini-totals">
          {totals.map((t) => (
            <span
              key={t.id}
              className={cx(t.won && 'w')}
              style={{ '--c': paletteVar(t.color) } as CSSProperties}
            >
              {t.name} {t.total}
            </span>
          ))}
        </div>
      </div>
      <span className="text-faint">
        <Icon name="right" size={18} />
      </span>
    </button>
  )
}

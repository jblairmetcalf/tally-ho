import type { CSSProperties } from 'react'
import { Chip } from '../brand/Chip'
import { paletteVar } from '../brand/palette'
import { cx } from '../cx'

export interface StandingsProps {
  /** Most wins first. `move`: places climbed (+) or slipped (−) in the last game (passing someone, not drawing level); 0 or absent shows nothing. */
  rows: { id: string; name: string; color: number; wins: number; played: number; move?: number }[]
  /** The words for a move, for screen readers ("Up 1 place since the last game"). */
  moveLabel?: (move: number) => string
  className?: string
}

/** ▲ or ▼ under the rank, with the count when it's more than one place. */
function Move({ move, label }: { move: number; label?: string }) {
  const up = move > 0
  const n = Math.abs(move)
  return (
    <span className={cx('move', up ? 'up' : 'down')} role="img" aria-label={label}>
      <svg viewBox="0 0 10 8" aria-hidden="true">
        <path d={up ? 'M5 0l5 8H0z' : 'M5 8L0 0h10z'} fill="currentColor" />
      </svg>
      {n > 1 && n}
    </span>
  )
}

/** The wins table: rank, chip, name with a growing bar, wins and win rate. */
export function Standings({ rows, moveLabel, className }: StandingsProps) {
  const maxW = Math.max(1, ...rows.map((r) => r.wins))
  // When anyone moved, unmoved ranks keep the mark's space so every number lines up.
  const anyMoved = rows.some((r) => r.move)
  return (
    <section className={cx('card', className)}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
        <h2 className="sec">Standings</h2>
        <span className="eyebrow">Wins</span>
      </div>
      {rows.map((x, i) => (
        <div className="stand" key={x.id} style={{ '--i': i } as CSSProperties}>
          <span className={cx('rank', i === 0 && 'r1')}>
            {i + 1}
            {x.move ? (
              <Move move={x.move} label={moveLabel?.(x.move)} />
            ) : anyMoved ? (
              <span className="move" aria-hidden="true" />
            ) : null}
          </span>
          <Chip name={x.name} color={x.color} size={34} />
          <div className="min-w-0">
            <div className="truncate" style={{ fontWeight: 900 }}>
              {x.name}
            </div>
            <div className="bar">
              <i
                style={
                  {
                    '--c': paletteVar(x.color),
                    '--i': i,
                    width: `${(x.wins / maxW) * 100}%`,
                  } as CSSProperties
                }
              />
            </div>
          </div>
          <div className="wins">
            {x.wins}
            <small>{x.played ? Math.round((x.wins / x.played) * 100) : 0}%</small>
          </div>
        </div>
      ))}
    </section>
  )
}

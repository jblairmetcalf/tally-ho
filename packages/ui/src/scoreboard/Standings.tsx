import type { CSSProperties } from 'react'
import { Chip } from '../brand/Chip'
import { paletteVar } from '../brand/palette'
import { cx } from '../cx'

export interface StandingsProps {
  /** Most wins first. */
  rows: { id: string; name: string; color: number; wins: number; played: number }[]
  className?: string
}

/** The wins table: rank, chip, name with a growing bar, wins and win rate. */
export function Standings({ rows, className }: StandingsProps) {
  const maxW = Math.max(1, ...rows.map((r) => r.wins))
  return (
    <section className={cx('card', className)}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
        <h2 className="sec">Standings</h2>
        <span className="eyebrow">Wins</span>
      </div>
      {rows.map((x, i) => (
        <div className="stand" key={x.id}>
          <span className={cx('rank', i === 0 && 'r1')}>{i + 1}</span>
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

import type { CSSProperties } from 'react'
import { Chip } from '../brand/Chip'
import { paletteVar } from '../brand/palette'
import { cx } from '../cx'

export interface RaceTrackProps {
  players: { id: string; name: string; color: number; total: number }[]
  target: number
  /** Low score wins: the line is a coral "bust" line instead of a finish. */
  lowWins: boolean
  className?: string
}

/** Score-race lanes: a chip runs along each dashed lane toward the checkered line (prototype `Track`). */
export function RaceTrack({ players, target, lowWins, className }: RaceTrackProps) {
  return (
    <div className={cx('card track', className)}>
      {players.map((p) => {
        const pct = Math.max(0, Math.min(1, target > 0 ? p.total / target : 0))
        return (
          <div key={p.id} className="lane" style={{ '--c': paletteVar(p.color) } as CSSProperties}>
            <div className="fill" style={{ width: `calc((100% - 28px) * ${pct})` }} />
            <div className={cx('finish', lowWins && 'bust')} />
            <div className="runner" style={{ left: `calc(14px + (100% - 28px) * ${pct})` }}>
              <Chip name={p.name} color={p.color} size={28} />
            </div>
          </div>
        )
      })}
      <div className="track-foot">
        <span>0</span>
        <span>{lowWins ? `Bust at ${target}` : `Finish at ${target}`}</span>
      </div>
    </div>
  )
}

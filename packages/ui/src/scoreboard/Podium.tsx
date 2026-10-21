import { ordinal } from '@tally/core'
import type { CSSProperties } from 'react'
import { Chip } from '../brand/Chip'
import { cx } from '../cx'

export interface PodiumRow {
  id: string
  name: string
  color: number
  total: number
}

export interface PodiumProps {
  /** Best first. */
  rows: PodiumRow[]
  /** Label the last place "Next time" and wobble it (only with more than 2 rows). */
  showLast?: boolean
  /** When the first row rises; each next row 110 ms later. Default 750 ms (the victory beat). */
  delayMs?: number
  /** Across the whole column (a game's details), not capped for the victory overlay. */
  wide?: boolean
}

/** The finishing order: ordinal, chip (crowned winner), name and total, rising in one by one. */
export function Podium({ rows, showLast = false, delayMs, wide = false }: PodiumProps) {
  return (
    <div
      className={wide ? 'podium wide' : 'podium'}
      style={delayMs == null ? undefined : ({ '--pod-delay': `${delayMs}ms` } as CSSProperties)}
    >
      {rows.map((p, i) => {
        const last = showLast && i === rows.length - 1 && rows.length > 2
        return (
          <div
            key={p.id}
            className={cx('pod', i === 0 && 'first', last && 'last')}
            style={{ '--i': i } as CSSProperties}
          >
            <span className="place">{ordinal(i + 1)}</span>
            <Chip name={p.name} color={p.color} size={34} crown={i === 0} />
            <span className="n">
              {p.name}
              {last && <span className="lbl block">Next time</span>}
            </span>
            <span className="t num">{p.total}</span>
          </div>
        )
      })}
    </div>
  )
}

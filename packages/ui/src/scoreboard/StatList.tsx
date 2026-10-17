import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../cx'

export interface StatListRow {
  /** What it measures, in words ("Longest streak"). */
  label: string
  /** The figure, in the display face, at the end of the row: usually a number. */
  value: ReactNode
  /** Who or what it belongs to, read first ("Kate", "Blair, Mille Bornes"). */
  detail?: string
}

export interface StatListProps {
  /** The card's heading ("By the numbers"). */
  title: string
  rows: StatListRow[]
  className?: string
  style?: CSSProperties
}

/**
 * One card of stats: a heading, then a row per stat split by hairlines — the label in muted
 * words on the left; on the right, who or what it belongs to, then the figure ("Kate  2").
 */
export function StatList({ title, rows, className, style }: StatListProps) {
  return (
    <section className={cx('card stat-list', className)} style={style}>
      <h2 className="sec">{title}</h2>
      <dl>
        {rows.map((r) => (
          <div className="stat-row" key={r.label}>
            <dt>{r.label}</dt>
            <dd>
              {r.detail && <span className="d">{r.detail}</span>}
              <span className={cx('v', typeof r.value === 'number' && 'num')}>{r.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

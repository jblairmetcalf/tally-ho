import type { CSSProperties, ReactNode } from 'react'
import { Icon, type IconName } from '../brand/Icon'
import { cx } from '../cx'

export interface StatTileProps {
  icon: IconName
  tone: 'jade' | 'coral' | 'amber' | 'lav'
  value: ReactNode
  label: string
  /** Smaller, single-line value for words (e.g. the most played game's name). */
  compact?: boolean
}

/** One of Home's four stat tiles. Lay them out in a `.stats` grid. */
export function StatTile({ icon, tone, value, label, compact }: StatTileProps) {
  return (
    <div className="stat" style={{ '--c': `var(--${tone})` } as CSSProperties}>
      <span className="ic">
        <Icon name={icon} size={20} />
      </span>
      <span className={cx('v', typeof value === 'number' && 'num', compact && 'compact')}>
        {value}
      </span>
      <span className="l">{label}</span>
    </div>
  )
}

import type { ReactNode } from 'react'
import { Fox } from '../brand/Fox'
import { cx } from '../cx'

export interface EmptyStateProps {
  /** The fox wears the crown (home: "No games yet"). */
  crown?: boolean
  title: string
  body: string
  /** A call to action under the copy. */
  action?: ReactNode
  className?: string
}

/** A card with the bobbing fox, a title and a line of copy. */
export function EmptyState({ crown = false, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cx('card empty', className)}>
      <Fox crown={crown} />
      <h2 className="sec">{title}</h2>
      <p className="hint" style={{ margin: 0, fontSize: 14 }}>
        {body}
      </p>
      {action}
    </div>
  )
}

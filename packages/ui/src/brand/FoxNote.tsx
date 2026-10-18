import type { ReactNode } from 'react'
import { cx } from '../cx'
import { Badge } from './Badge'

export interface FoxNoteProps {
  /** The warm headline ("Made by Blair Metcalf"). */
  title: string
  /** A line or two under it. */
  body?: ReactNode
  /** `row`: badge beside the words (a sheet's opening line). `center`: badge above (a hero). */
  layout?: 'row' | 'center'
  /** The fox winks once as it spins in. */
  wink?: boolean
  className?: string
}

/** The fox narrating: its ink badge with a headline and a line of copy. */
export function FoxNote({ title, body, layout = 'row', wink, className }: FoxNoteProps) {
  return (
    <div className={cx('fox-note', layout, className)}>
      <Badge wink={wink} />
      <div className="fox-note-words">
        <p className="fox-note-title">{title}</p>
        {body && <p className="fox-note-body">{body}</p>}
      </div>
    </div>
  )
}

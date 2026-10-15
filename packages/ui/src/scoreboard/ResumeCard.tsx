import { Icon } from '../brand/Icon'
import { cx } from '../cx'

export interface ResumeCardProps {
  /** The game's name. */
  name: string
  /** e.g. "Round 4 · Race to 200". */
  sub: string
  onClick: () => void
  className?: string
}

/** The jade "In progress" card on Home that takes you back to the live game. */
export function ResumeCard({ name, sub, onClick, className }: ResumeCardProps) {
  return (
    <button type="button" className={cx('resume', className)} onClick={onClick}>
      <div className="min-w-0 flex-1">
        <div className="eyebrow text-jade-text">
          <span className="live-dot" />
          In progress
        </div>
        <div className="display truncate" style={{ fontSize: 26, marginTop: 4 }}>
          {name}
        </div>
        <div className="hint text-muted">{sub}</div>
      </div>
      <span className="btn btn-jade btn-sm">
        Resume <Icon name="right" size={18} />
      </span>
    </button>
  )
}

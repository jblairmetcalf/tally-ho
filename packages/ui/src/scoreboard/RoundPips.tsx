import { cx } from '../cx'

export interface RoundPipsProps {
  /** Rounds in the game. */
  target: number
  /** Rounds played. */
  done: number
  className?: string
}

/** A rounds-game progress strip: jade pips for played rounds, a pulsing amber one for now. */
export function RoundPips({ target, done, className }: RoundPipsProps) {
  const left = Math.max(0, target - done)
  return (
    <div
      className={cx('card', 'flex items-center justify-between gap-3', className)}
      style={{ padding: '12px 14px' }}
    >
      <div
        className="pips"
        role="img"
        aria-label={`Round ${Math.min(done + 1, target)} of ${target}`}
      >
        {Array.from({ length: target }, (_, i) => (
          <i key={i} className={i < done ? 'done' : i === done ? 'now' : undefined} />
        ))}
      </div>
      <span className="eyebrow">{left} left</span>
    </div>
  )
}

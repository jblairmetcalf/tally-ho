import type { CSSProperties } from 'react'
import { cx } from '../cx'

const word = (text: string, cls: string, offset: number) => (
  <span className={cls} style={{ display: 'inline-flex' }}>
    {[...text].map((ch, i) => (
      <span key={i} style={{ '--i': i + offset } as CSSProperties}>
        {ch}
      </span>
    ))}
  </span>
)

export interface WordmarkProps {
  className?: string
}

/** "TALLY HO!" in amber and jade; each letter drops in on a spring, tilted alternately. */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <div className={cx('wordmark', className)} role="img" aria-label="Tally Ho!">
      {word('TALLY', 'w1', 0)}
      {word('HO!', 'w2', 5)}
    </div>
  )
}

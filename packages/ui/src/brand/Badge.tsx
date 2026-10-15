import { cx } from '../cx'
import { Fox } from './Fox'

export interface BadgeProps {
  crown?: boolean
  wink?: boolean
  className?: string
}

/** The 62px ink disc with the fox and a jade ring: the app's header mark. Spins in on mount. */
export function Badge({ crown, wink, className }: BadgeProps) {
  return (
    <div className={cx('badge', className)}>
      <Fox crown={crown} wink={wink} />
    </div>
  )
}

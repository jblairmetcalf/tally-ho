import { Icon, type IconName } from '../brand/Icon'
import { cx } from '../cx'

export interface ToastProps {
  message: string
  icon?: IconName
  /**
   * `nav` (default) floats above the bottom nav; `bottom` sits at the bottom edge (in a game, no
   * nav); `inline` renders in flow (stories, docs). Re-key the Toast to replay its entrance.
   */
  placement?: 'nav' | 'bottom' | 'inline'
}

/** The cream pill that pops up from the bottom ("Ana takes the lead"). */
export function Toast({ message, icon = 'crown', placement = 'nav' }: ToastProps) {
  return (
    <div
      className={cx(
        'toast',
        placement === 'bottom' && 'no-nav',
        placement === 'inline' && 'in-flow',
      )}
      role="status"
    >
      <Icon name={icon} size={18} />
      {message}
    </div>
  )
}

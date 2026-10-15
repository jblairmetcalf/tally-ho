import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from '../brand/Icon'
import { cx } from '../cx'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName
  /** The accessible name. Required: the button has no visible text. */
  label: string
  /** Lit in jade (e.g. sound on). */
  on?: boolean
  /** Coral (e.g. end game). */
  danger?: boolean
}

/** A 44px rounded-square icon button that tilts when pressed. */
export function IconButton({
  icon,
  label,
  on,
  danger,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx('icon-btn', on && 'on', danger && 'danger', className)}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  )
}

import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Icon, type IconName } from '../brand/Icon'
import { cx } from '../cx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'jade' | 'amber' | 'ghost' | 'coral'
  size?: 'md' | 'sm'
  block?: boolean
  /** Coral only: the second-tap state of a destructive confirm. Shakes and fills. */
  armed?: boolean
  icon?: IconName
  iconSize?: number
}

/** The chunky "3-D press" button: a coloured slab on a darker edge that squashes on tap. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'jade',
    size = 'md',
    block,
    armed,
    icon,
    iconSize,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'btn',
        `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        block && 'btn-block',
        armed && 'armed',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={iconSize ?? (size === 'sm' ? 18 : 22)} />}
      {children}
    </button>
  )
})

import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, forwardRef } from 'react'
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

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  variant?: 'jade' | 'amber' | 'ghost'
  size?: 'md' | 'sm'
  block?: boolean
  icon?: IconName
  iconSize?: number
  /** Open in a new tab (adds `target="_blank"` and `rel="noopener"`). */
  external?: boolean
}

/** A link that looks and presses exactly like `Button` (somewhere else, not an action here). */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'jade', size = 'md', block, icon, iconSize, external, className, children, ...rest },
  ref,
) {
  return (
    <a
      ref={ref}
      className={cx(
        'btn',
        `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        block && 'btn-block',
        className,
      )}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {icon && <Icon name={icon} size={iconSize ?? (size === 'sm' ? 18 : 22)} />}
      {children}
    </a>
  )
})

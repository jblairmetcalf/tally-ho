import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Icon, type IconName } from '../brand/Icon'
import { cx } from '../cx'

export type LinkRowTone = 'jade' | 'amber' | 'fox' | 'coral' | 'lav'

export interface LinkRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /** The icon in the leading tile. */
  icon: IconName
  /** The jewel the tile is filled with. Default jade. */
  tone?: LinkRowTone
  title: string
  /** A short line under the title ("Show a QR code"). */
  hint?: string
}

/**
 * A full-width menu row: a tinted icon tile, a title with an optional hint, and a chevron.
 * At least 56px tall. Opens something (a nested sheet); the caller plays the sound.
 */
export const LinkRow = forwardRef<HTMLButtonElement, LinkRowProps>(function LinkRow(
  { icon, tone = 'jade', title, hint, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cx('link-row', className)} {...rest}>
      <span className={cx('link-tile', `tone-${tone}`)} aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <span className="link-text">
        <b>{title}</b>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <Icon name="right" size={18} className="link-chev" />
    </button>
  )
})

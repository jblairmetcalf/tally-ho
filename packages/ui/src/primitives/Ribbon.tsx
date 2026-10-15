import { cx } from '../cx'

export interface RibbonProps {
  text: string
  tone?: 'jade' | 'amber' | 'coral'
  /** In flow and still (no fly-through), for stories and docs. */
  inline?: boolean
}

/** The banner that sweeps across the screen ("Round 3", "Final round!", "Tiebreak!"). Re-key to replay. */
export function Ribbon({ text, tone = 'jade', inline = false }: RibbonProps) {
  return (
    <div className={cx('ribbon-wrap', inline && 'in-flow')} aria-live="polite">
      <div className={cx('ribbon', tone !== 'jade' && tone, inline && 'still')}>{text}</div>
    </div>
  )
}

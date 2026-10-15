import type { ReactNode } from 'react'
import { Chip } from '../brand/Chip'
import { cx } from '../cx'

export interface PillProps {
  /** Selected: jade fill, pops in. */
  on?: boolean
  onClick: () => void
  children: ReactNode
  /** A small player chip before the label (winner filters). */
  chip?: { name: string; color: number | string }
}

/** A chunky choice pill (game presets, filters). Toggle semantics via `aria-pressed`. */
export function Pill({ on = false, onClick, children, chip }: PillProps) {
  return (
    <button type="button" className={cx('pill', on && 'on')} aria-pressed={on} onClick={onClick}>
      {chip && <Chip name={chip.name} color={chip.color} size={20} />}
      {children}
    </button>
  )
}

export interface PillRowProps {
  /** One scrolling line instead of wrapping. */
  scroll?: boolean
  /** The group's accessible name. */
  label?: string
  children: ReactNode
}

/** A wrapping (or horizontally scrolling) row of pills. */
export function PillRow({ scroll = false, label, children }: PillRowProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a flex row of pills; a fieldset would fight the layout
    <div className={cx('pills', scroll && 'scroll')} role="group" aria-label={label}>
      {children}
    </div>
  )
}

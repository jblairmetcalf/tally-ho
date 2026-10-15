import type { CSSProperties } from 'react'
import { cx } from '../cx'
import { rovingKey } from './roving'

export interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** The radiogroup's accessible name. */
  label: string
}

/** A segmented control in a sunk well (the "How does it end?" picker). A radiogroup; arrows move. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedProps<T>) {
  const current = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  return (
    <div
      className="seg"
      role="radiogroup"
      aria-label={label}
      style={{ '--cols': options.length } as CSSProperties}
    >
      {options.map((o, i) => {
        const on = o.value === value
        return (
          // biome-ignore lint/a11y/useSemanticElements: a styled button radio, as the prototype; arrow keys handled
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === current ? 0 : -1}
            className={cx(on && 'on')}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const next = rovingKey(e, i, options.length)
              const opt = next == null ? undefined : options[next]
              if (opt) onChange(opt.value)
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

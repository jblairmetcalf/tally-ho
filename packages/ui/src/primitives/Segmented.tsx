import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '../cx'
import { rovingKey } from './roving'

export interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** The radiogroup's accessible name. */
  label: string
}

/**
 * A segmented control in a sunk well (the "How does it end?" picker). A radiogroup; arrows move.
 * The raised background is one thumb that springs to the chosen segment (columns may differ in
 * width, so it measures the button rather than assume equal thirds).
 */
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
  const well = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLSpanElement>(null)
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null)
  // Measure the chosen segment before paint, and again whenever the well changes size.
  useLayoutEffect(() => {
    const el = well.current
    if (!el) return
    const place = () => {
      const b = el.querySelectorAll<HTMLElement>('[role="radio"]')[current]
      const inset = track.current?.offsetLeft ?? 0
      if (b?.offsetWidth) setThumb({ x: b.offsetLeft - inset, w: b.offsetWidth })
    }
    place()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [current])
  return (
    <div
      ref={well}
      className="seg"
      role="radiogroup"
      aria-label={label}
      style={{ '--cols': options.length } as CSSProperties}
    >
      {/* The thumb springs (and overshoots) inside its own clipped track, so it never pokes
          out of the well, while the buttons' focus rings stay unclipped. */}
      <span ref={track} className="seg-track" aria-hidden="true">
        {thumb && (
          <span
            className="seg-thumb"
            style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }}
          />
        )}
      </span>
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

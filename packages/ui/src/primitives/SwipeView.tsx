import { type CSSProperties, type ReactNode, type TouchEvent, useRef, useState } from 'react'
import { cx } from '../cx'

export interface SwipeViewProps {
  /** Swiped far or fast enough toward a neighbour: `next` (swiped left) or `prev` (swiped right). */
  onSwipe: (to: 'next' | 'prev') => void
  /** Is there a screen that way? Without one, the drag gives a little and springs back. */
  hasPrev: boolean
  hasNext: boolean
  /** How this screen arrived: sliding in from the next side or the previous one (or not at all). */
  enter?: 'from-next' | 'from-prev' | null
  className?: string
  children: ReactNode
}

/** How far (px) or how fast (px/ms) a horizontal drag must go to change screens. */
const DISTANCE = 72
const SPEED = 0.45

/** Is the touch inside something that scrolls sideways itself (a pill row, a shelf, a long staff)? */
function inSideScroller(el: Element | null, stop: Element): boolean {
  for (let n = el; n && n !== stop; n = n.parentElement) {
    if (n.matches('input, textarea, select, [contenteditable], [data-no-swipe]')) return true
    if (n.scrollWidth > n.clientWidth + 1) {
      const x = getComputedStyle(n).overflowX
      if (x === 'auto' || x === 'scroll') return true
    }
  }
  return false
}

/**
 * Tabs you can swipe between (Home ⇄ History): the screen follows a horizontal drag (with some
 * resistance where there's nothing that way), then either changes screens or springs back. The
 * next screen slides in from the side you swiped toward. Vertical scrolling is untouched, and a
 * drag that starts in a sideways scroller or a text field belongs to it.
 */
export function SwipeView({
  onSwipe,
  hasPrev,
  hasNext,
  enter = null,
  className,
  children,
}: SwipeViewProps) {
  const start = useRef<{
    x: number
    y: number
    t: number
    axis: 'x' | 'y' | null
    dx: number
  } | null>(null)
  const [dx, setDx] = useState(0)
  const [settling, setSettling] = useState(false)

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0]
    if (e.touches.length !== 1 || !t || inSideScroller(e.target as Element, e.currentTarget)) {
      start.current = null
      return
    }
    start.current = { x: t.clientX, y: t.clientY, t: e.timeStamp, axis: null, dx: 0 }
    setSettling(false)
  }
  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const s = start.current
    const t = e.touches[0]
    if (!s || !t) return
    const x = t.clientX - s.x
    const y = t.clientY - s.y
    if (!s.axis && Math.max(Math.abs(x), Math.abs(y)) > 10)
      s.axis = Math.abs(x) > Math.abs(y) * 1.2 ? 'x' : 'y'
    if (s.axis !== 'x') return
    const open = x < 0 ? hasNext : hasPrev
    // The distance lives in the ref (the handlers can't wait for a render to read it).
    s.dx = open ? x : x * 0.25
    setDx(s.dx)
  }
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const s = start.current
    start.current = null
    if (s?.axis !== 'x') return
    const d = s.dx
    const v = d / Math.max(1, e.timeStamp - s.t)
    setSettling(true)
    setDx(0)
    if ((d <= -DISTANCE || v <= -SPEED) && hasNext) onSwipe('next')
    else if ((d >= DISTANCE || v >= SPEED) && hasPrev) onSwipe('prev')
  }

  return (
    <div
      className={cx('swipe-view', enter, settling && 'settling', className)}
      style={
        dx
          ? ({
              transform: `translateX(${dx}px)`,
              opacity: 1 - Math.min(0.35, Math.abs(dx) / 900),
            } as CSSProperties)
          : undefined
      }
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {children}
    </div>
  )
}

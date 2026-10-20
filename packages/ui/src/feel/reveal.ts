/**
 * A change (the theme) revealed by a circle that grows from a point, like ink spreading from the
 * button you pressed. Uses the View Transitions API: the browser snapshots the page, `apply`
 * changes it synchronously, and the new page grows over the old one as a clip-path circle
 * (`themeReveal` in motion.css). Without the API, under reduced motion, or with no point, the
 * change just happens.
 *
 * `apply` must update the DOM before it returns (in React: `flushSync`).
 */
export function revealFrom(origin: { x: number; y: number } | null, apply: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (update: () => void) => { finished: Promise<void> }
  }
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!origin || !doc.startViewTransition || still) {
    apply()
    return
  }
  const { x, y } = origin
  // Far enough to cover the farthest corner.
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const root = document.documentElement
  root.style.setProperty('--reveal-x', `${x}px`)
  root.style.setProperty('--reveal-y', `${y}px`)
  root.style.setProperty('--reveal-r', `${Math.ceil(r)}px`)
  root.classList.add('theme-reveal')
  doc
    .startViewTransition(apply)
    .finished.catch(() => {})
    .finally(() => root.classList.remove('theme-reveal'))
}

/** Where a control sits on screen: its centre, for a reveal started from the keyboard. */
export function centreOf(el: Element | null): { x: number; y: number } | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

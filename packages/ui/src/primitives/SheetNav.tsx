import * as Dialog from '@radix-ui/react-dialog'
import { type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { cx } from '../cx'
import { IconButton } from './IconButton'
import { SheetEscape } from './Sheet'

/** How long a push or a pop slides (the `navIn…` / `navOut…` keyframes run this long). */
const NAV_MS = 420

export interface SheetNavPage {
  /** Stable for as long as the page is on the stack: it keeps the page (and its state) mounted. */
  key: string
  /** The header title while this page is on top, and the dialog's accessible name. */
  title: string
  content: ReactNode
}

export interface SheetNavProps {
  /** The stack, root first. The last page is the one on screen. */
  pages: SheetNavPage[]
  /** The back button (and Escape) on any page past the root. The caller pops the last page. */
  onBack: () => void
  /** The close button, top right on every page: closes the whole sheet. */
  onClose: () => void
  /** The back button's accessible name ("Back"). */
  backLabel: string
  /** The close button's accessible name ("Close"). */
  closeLabel: string
}

type Move = { dir: 'push' | 'pop'; enter: string; exit: string }

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A navigation stack inside one `Sheet` (render it as the content of `<Sheet nav>`). One header
 * that never scrolls away: a back button top left on any page past the root, the current page's
 * title (the dialog's accessible name), and the close button always top right.
 *
 * Pushing slides the new page in from the right while the one beneath slides a little left, like
 * iOS; popping plays it backwards. Every page is its own scroll container and stays mounted while
 * it's on the stack, so its scroll position and state are there when you come back; pages not on
 * top are `inert`, `aria-hidden` and hidden once the slide ends. Reduced motion swaps instantly.
 * A push moves focus to the new page's title (or a field that autofocused); a pop hands it back
 * to the control that pushed. Escape goes back a page, and closes the sheet at the root.
 */
export function SheetNav({ pages, onBack, onClose, backLabel, closeLabel }: SheetNavProps) {
  const top = pages[pages.length - 1]
  const keys = pages.map((p) => p.key).join('\n')
  const [seen, setSeen] = useState(keys)
  const [move, setMove] = useState<Move | null>(null)
  // A popped page stays on screen (above the one it uncovers) while it slides away.
  const [leaving, setLeaving] = useState<SheetNavPage | null>(null)
  const last = useRef(pages)
  // The control that pushed each page, to hand focus back on the way out.
  const openers = useRef(new Map<string, HTMLElement>())
  const title = useRef<HTMLHeadingElement>(null)
  const pageEls = useRef(new Map<string, HTMLDivElement>())

  if (keys !== seen) {
    const before = seen.split('\n')
    const oldTop = before[before.length - 1] ?? ''
    const newTop = top?.key ?? ''
    setSeen(keys)
    if (oldTop !== newTop) {
      // Back to a page that was beneath, with the old top gone: a pop. Anything else: a push.
      const pop = !pages.some((p) => p.key === oldTop) && before.includes(newTop)
      setMove({ dir: pop ? 'pop' : 'push', enter: newTop, exit: oldTop })
      setLeaving(pop ? (last.current.find((p) => p.key === oldTop) ?? null) : null)
      if (!pop && typeof document !== 'undefined') {
        const el = document.activeElement
        if (el instanceof HTMLElement && el !== document.body) openers.current.set(newTop, el)
      }
    }
  }

  useEffect(() => {
    last.current = pages
  })

  // Focus follows the move; then the slide ends and the pages beneath hide.
  useEffect(() => {
    if (!move) return
    const page = pageEls.current.get(move.enter)
    if (move.dir === 'push') {
      if (!page?.contains(document.activeElement)) title.current?.focus({ preventScroll: true })
    } else {
      const el = openers.current.get(move.exit)
      openers.current.delete(move.exit)
      if (el?.isConnected && page?.contains(el)) el.focus({ preventScroll: true })
      else title.current?.focus({ preventScroll: true })
    }
    const t = setTimeout(
      () => {
        setMove(null)
        setLeaving(null)
      },
      reducedMotion() ? 0 : NAV_MS,
    )
    return () => clearTimeout(t)
  }, [move])

  // Escape goes back a page while there's one to go back to (the Sheet asks first).
  const onEscape = useContext(SheetEscape)
  const deep = pages.length > 1
  useEffect(() => {
    if (!onEscape) return
    onEscape.current = () => {
      if (!deep) return false
      onBack()
      return true
    }
    return () => {
      onEscape.current = null
    }
  }, [onEscape, deep, onBack])

  const shown = leaving && !pages.some((p) => p.key === leaving.key) ? [...pages, leaving] : pages

  return (
    <div className="sheet-nav">
      <div className="sheet-title sheet-nav-head">
        {deep && (
          <IconButton
            icon="back"
            label={backLabel}
            className="sheet-back"
            key="back"
            onClick={onBack}
          />
        )}
        <Dialog.Title asChild>
          <h3 ref={title} tabIndex={-1} key={top?.key}>
            {top?.title}
          </h3>
        </Dialog.Title>
        <IconButton icon="x" label={closeLabel} onClick={onClose} />
      </div>
      <div className="sheet-nav-pages">
        {shown.map((p) => {
          const onTop = p.key === top?.key
          const sliding = move && (p.key === move.enter || p.key === move.exit)
          return (
            <div
              key={p.key}
              ref={(el) => {
                if (el) pageEls.current.set(p.key, el)
                else pageEls.current.delete(p.key)
              }}
              className={cx(
                'sheet-body sheet-page',
                move?.enter === p.key && (move.dir === 'push' ? 'in-push' : 'in-pop'),
                move?.exit === p.key && (move.dir === 'push' ? 'out-push' : 'out-pop'),
                !onTop && !sliding && 'off',
              )}
              inert={!onTop}
              aria-hidden={onTop ? undefined : true}
            >
              {p.content}
            </div>
          )
        })}
      </div>
    </div>
  )
}

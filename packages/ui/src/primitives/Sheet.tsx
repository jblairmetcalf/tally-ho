import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  type CSSProperties,
  createContext,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { cx } from '../cx'
import { IconButton } from './IconButton'

/** How long `.closing` plays before the sheet unmounts (the prototype's 290 ms). */
const CLOSE_MS = 290
/** Drag the grab handle further than this to dismiss. */
const DISMISS_PX = 100

/**
 * Lets content inside a Sheet take Escape first (a `SheetNav` goes back a page). The handler
 * returns true when it used the key; otherwise Escape closes the sheet.
 */
export const SheetEscape = createContext<{ current: (() => boolean) | null } | null>(null)

export interface SheetProps {
  open: boolean
  /** Escape, backdrop tap or a drag past 100px. The caller flips `open` (and plays `SFX.close`). */
  onClose: () => void
  /** The dialog's accessible name (a `nav` sheet is named by its current page instead). */
  label: string
  /**
   * The content is a `SheetNav`: the sheet stands at full height (so pages of any length never
   * resize it), the nav's fixed header supplies the dialog's title (the current page's, so the
   * accessible name follows the page) and each page scrolls on its own.
   */
  nav?: boolean
  children: ReactNode
}

/**
 * The bottom sheet. Radix Dialog gives focus trap, Escape, outside-tap and scroll lock; the
 * slide in/out are the prototype's `sheetIn` / `.closing` keyframes, and the grab handle drags
 * exactly like the prototype: the sheet follows the finger, past 100px it leaves from where it
 * was let go, otherwise it springs back. Portals into the nearest ThemeRoot so tokens apply.
 *
 * One sheet at a time. Somewhere deeper to go (Settings › Players › Edit Kate) is a page pushed
 * inside it with `SheetNav`, never a second sheet on top: Escape goes back a page there, and
 * closing (the close button, a backdrop tap, a drag) always closes the whole sheet.
 */
export function Sheet({ open, onClose, label, nav = false, children }: SheetProps) {
  const [shown, setShown] = useState(open)
  const [prevOpen, setPrevOpen] = useState(open)
  const [dy, setDy] = useState(0)
  const [from, setFrom] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [touched, setTouched] = useState(false)
  const drag = useRef<number | null>(null)
  const dyRef = useRef(0)
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null)
  const [onEscape] = useState<{ current: (() => boolean) | null }>(() => ({ current: null }))
  // What opened the sheet, so closing hands focus back (Radix only knows a Dialog.Trigger).
  const opener = useRef<HTMLElement | null>(null)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setShown(true)
      setDy(0)
      setFrom(0)
      setTouched(false)
      dyRef.current = 0
    }
  }
  const closing = shown && !open

  useEffect(() => {
    if (!closing) return
    const t = setTimeout(() => setShown(false), CLOSE_MS)
    return () => clearTimeout(t)
  }, [closing])

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (closing) return
    drag.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setTouched(true)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current == null) return
    const v = Math.max(0, e.clientY - drag.current)
    dyRef.current = v
    setDy(v)
  }
  const up = () => {
    if (drag.current == null) return
    drag.current = null
    setDragging(false)
    if (dyRef.current > DISMISS_PX) {
      setFrom(dyRef.current)
      onClose()
    } else {
      dyRef.current = 0
      setDy(0)
    }
  }

  const style = { '--from': `${from}px` } as CSSProperties
  if (touched && !closing) {
    // Once dragged, the entrance has finished: drop it so the inline transform can win.
    style.animation = 'none'
    style.transform = `translateY(${dy}px)`
    style.transition = dragging ? 'none' : 'transform .4s var(--spring)'
  }

  const container = anchor?.closest<HTMLElement>('.tally') ?? undefined

  return (
    <>
      <span ref={setAnchor} hidden />
      {anchor && (
        <Dialog.Root
          open={shown}
          onOpenChange={(next) => {
            if (!next && open) onClose()
          }}
        >
          <Dialog.Portal container={container}>
            <div className={cx('sheet-wrap', nav && 'paged', closing && 'closing')}>
              <Dialog.Overlay className="backdrop" />
              <Dialog.Content
                className="sheet"
                style={style}
                aria-describedby={undefined}
                onEscapeKeyDown={(e) => {
                  // A nav deeper than its root goes back a page; otherwise the sheet closes.
                  e.preventDefault()
                  if (closing || onEscape.current?.()) return
                  onClose()
                }}
                onOpenAutoFocus={() => {
                  const el = document.activeElement
                  opener.current = el instanceof HTMLElement && el !== document.body ? el : null
                }}
                onCloseAutoFocus={(e) => {
                  // Back to the opener, if it's still there.
                  const el = opener.current
                  if (!el?.isConnected) return
                  e.preventDefault()
                  el.focus({ preventScroll: true })
                }}
              >
                {!nav && (
                  <VisuallyHidden asChild>
                    <Dialog.Title>{label}</Dialog.Title>
                  </VisuallyHidden>
                )}
                <div
                  className="grab"
                  aria-hidden="true"
                  onPointerDown={down}
                  onPointerMove={move}
                  onPointerUp={up}
                  onPointerCancel={up}
                >
                  <span />
                </div>
                <SheetEscape.Provider value={onEscape}>
                  {nav ? children : <div className="sheet-body">{children}</div>}
                </SheetEscape.Provider>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  )
}

export interface SheetTitleProps {
  title: string
  onClose: () => void
}

/**
 * A single-page sheet's heading row: a display-face h3 and the close button, top right. A sheet
 * with pages uses `SheetNav`, whose header adds the back button on every page past the first.
 */
export function SheetTitle({ title, onClose }: SheetTitleProps) {
  return (
    <div className="sheet-title">
      <h3>{title}</h3>
      <IconButton icon="x" label="Close" onClick={onClose} />
    </div>
  )
}

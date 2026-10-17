import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  type CSSProperties,
  createContext,
  type PointerEvent,
  type ReactNode,
  useContext,
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

/** How many sheets deep we are: a Sheet rendered inside another's content is nested. */
const SheetDepth = createContext(0)

export interface SheetProps {
  open: boolean
  /** Escape, backdrop tap or a drag past 100px. The caller flips `open` (and plays `SFX.close`). */
  onClose: () => void
  /** The dialog's accessible name. */
  label: string
  children: ReactNode
}

/**
 * The bottom sheet. Radix Dialog gives focus trap, Escape, outside-tap and scroll lock; the
 * slide in/out are the prototype's `sheetIn` / `.closing` keyframes, and the grab handle drags
 * exactly like the prototype: the sheet follows the finger, past 100px it leaves from where it
 * was let go, otherwise it springs back. Portals into the nearest ThemeRoot so tokens apply.
 *
 * Sheets nest: render a Sheet inside another's children and it portals after it into the same
 * ThemeRoot, so it stacks on top with its own backdrop. Radix keeps the layers straight: Escape,
 * outside taps and the focus trap belong to the top sheet; closing it hands focus back to what
 * opened it. The sheet beneath sits under the top one's backdrop, so only the top one drags.
 */
export function Sheet({ open, onClose, label, children }: SheetProps) {
  const [shown, setShown] = useState(open)
  const [prevOpen, setPrevOpen] = useState(open)
  const [dy, setDy] = useState(0)
  const [from, setFrom] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [touched, setTouched] = useState(false)
  const drag = useRef<number | null>(null)
  const dyRef = useRef(0)
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null)
  const depth = useContext(SheetDepth)
  const wrap = useRef<HTMLDivElement>(null)
  // What opened the sheet, so closing hands focus back (Radix only knows a Dialog.Trigger).
  const opener = useRef<{ el: HTMLElement | null; dialog: HTMLElement | null }>({
    el: null,
    dialog: null,
  })

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

  // Radix tracks its layers a render late, so for a beat after a nested sheet opens, Escape
  // would close the sheet beneath. The DOM knows at once: the last sheet in the root is on top.
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      const el = wrap.current
      if (e.key !== 'Escape' || !el) return
      const sheets = el.parentElement?.querySelectorAll(':scope > .sheet-wrap')
      if (!sheets || sheets[sheets.length - 1] !== el) return
      e.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [open, onClose])

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
            <div
              ref={wrap}
              className={cx('sheet-wrap', depth > 0 && 'nested', closing && 'closing')}
            >
              <Dialog.Overlay className="backdrop" />
              <Dialog.Content
                className="sheet"
                style={style}
                aria-describedby={undefined}
                // Escape is ours (below), not Radix's: see `isTop`.
                onEscapeKeyDown={(e) => e.preventDefault()}
                onOpenAutoFocus={() => {
                  const el = document.activeElement
                  opener.current =
                    el instanceof HTMLElement && el !== document.body
                      ? { el, dialog: el.closest<HTMLElement>('[role="dialog"]') }
                      : { el: null, dialog: null }
                }}
                onCloseAutoFocus={(e) => {
                  // Back to the opener; if it's gone (an archived player's row), to the sheet
                  // beneath, so focus never falls out of a still-open sheet.
                  const { el, dialog } = opener.current
                  const to = el?.isConnected ? el : dialog?.isConnected ? dialog : null
                  if (!to) return
                  e.preventDefault()
                  to.focus({ preventScroll: true })
                }}
              >
                <VisuallyHidden asChild>
                  <Dialog.Title>{label}</Dialog.Title>
                </VisuallyHidden>
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
                <div className="sheet-body">
                  <SheetDepth.Provider value={depth + 1}>{children}</SheetDepth.Provider>
                </div>
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

/** The sheet's heading row: a display-face h3 and a close button. */
export function SheetTitle({ title, onClose }: SheetTitleProps) {
  return (
    <div className="sheet-title">
      <h3>{title}</h3>
      <IconButton icon="x" label="Close" onClick={onClose} />
    </div>
  )
}

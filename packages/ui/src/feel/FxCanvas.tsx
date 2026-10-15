import { useEffect, useRef } from 'react'
import { attachCanvas } from './confetti'

/** The one full-screen confetti canvas. Mount it once near the root; `FX.*` paints on it. */
export function FxCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    return attachCanvas(el)
  }, [])
  // biome-ignore lint/a11y/noAriaHiddenOnFocusable: a decorative, non-focusable canvas
  return <canvas ref={ref} className="fx-canvas" aria-hidden="true" />
}

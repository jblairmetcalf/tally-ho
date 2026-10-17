import type { Store, ThemePref } from '@tally/core'
import { useEffect, useRef, useState } from 'react'
import { withTheme } from './fixtures'
import { memoryProvider } from './provider'
import type { UiState } from './store'
import { TallyApp } from './TallyApp'

export interface FramesProps {
  store: () => Store
  ui?: Partial<UiState>
  /**
   * Stories only: drive each frame into a state its local UI holds (a picked game, an open
   * editor). Called after mount, then every 50 ms until it returns true (or 3 s pass).
   */
  act?: (frame: HTMLElement) => boolean
}

/** Click the first button in `root` whose accessible name is exactly `name`. */
export function clickButton(root: ParentNode, name: string): boolean {
  const b = [...root.querySelectorAll('button')].find(
    (x) => (x.getAttribute('aria-label') ?? x.textContent ?? '').trim() === name,
  )
  b?.click()
  return !!b
}

const THEMES: { id: Exclude<ThemePref, 'system'>; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Daylight' },
]

/**
 * The whole app twice, side by side: dark and Daylight, each in a phone-sized frame with its
 * own in-memory store. `transform` makes each frame the containing block for the app's fixed
 * nav, sheets, toasts and overlays, so they stay inside it.
 */
export function Frames({ store, ui, act }: FramesProps) {
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 24, alignItems: 'flex-start' }}
    >
      {THEMES.map((t) => (
        <figure key={t.id} style={{ margin: 0 }}>
          <figcaption className="sb-label">{t.label}</figcaption>
          <Frame theme={t.id} store={store} ui={ui} act={act} />
        </figure>
      ))}
    </div>
  )
}

function Frame({ theme, store, ui, act }: FramesProps & { theme: ThemePref }) {
  const [provider] = useState(() => memoryProvider(withTheme(store(), theme)))
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!act || !el) return
    const started = Date.now()
    const t = setInterval(() => {
      if (act(el) || Date.now() - started > 3000) clearInterval(t)
    }, 50)
    return () => clearInterval(t)
  }, [act])
  return (
    <div
      ref={ref}
      style={{
        width: 390,
        height: 844,
        overflow: 'auto',
        transform: 'translateZ(0)',
        borderRadius: 28,
        boxShadow: '0 0 0 1px rgb(127 127 127 / 0.3)',
      }}
    >
      <TallyApp provider={provider} initialUi={ui} embedded />
    </div>
  )
}

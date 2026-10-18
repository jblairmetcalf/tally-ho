import type { Store, ThemePref } from '@tally/core'
import { useEffect, useRef, useState } from 'react'
import { withTheme } from './fixtures'
import { memoryProvider } from './provider'
import type { UiState } from './store'
import type { SessionApi } from './sync/session'
import { TallyApp } from './TallyApp'

export interface FramesProps {
  store: () => Store
  ui?: Partial<UiState>
  /**
   * Stories only: drive each frame into a state its local UI holds (a picked game, an open
   * editor). Called after mount, then every 50 ms until it returns true (or 3 s pass).
   */
  act?: (frame: HTMLElement) => boolean
  /** A fake session (`demoSession(...)`), for the sign-in UI; default: the build's own. */
  session?: () => SessionApi
}

/** The title of the page on top of a sheet with pages (Settings), or undefined. */
const pageTitle = (root: ParentNode) =>
  root.querySelector('.sheet-nav-head h3')?.textContent ?? undefined

/** The page on top of a sheet with pages: the one that isn't inert. */
const topPage = (root: ParentNode) =>
  root.querySelector<HTMLElement>('.sheet-page:not([inert])') ?? undefined

/** Tap the menu row titled `title` (a `LinkRow`) inside `root`. */
export function clickRow(root: ParentNode, title: string): boolean {
  const row = [...root.querySelectorAll<HTMLButtonElement>('.link-row')].find(
    (b) => b.querySelector('b')?.textContent === title,
  )
  row?.click()
  return !!row
}

/**
 * Push Settings pages one after another: each step taps something on the page on top
 * (`press`) and waits until the header reads `title`. For a story's `act`.
 */
export const pushPages =
  (...steps: { title: string; press: (page: HTMLElement) => boolean }[]) =>
  (frame: HTMLElement) => {
    const now = pageTitle(frame)
    const at = steps.findIndex((s) => s.title === now)
    const next = steps[at + 1]
    if (!next) return at === steps.length - 1
    const page = topPage(frame)
    if (page) next.press(page)
    return false
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
export function Frames({ store, ui, act, session }: FramesProps) {
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 24, alignItems: 'flex-start' }}
    >
      {THEMES.map((t) => (
        <figure key={t.id} style={{ margin: 0 }}>
          <figcaption className="sb-label">{t.label}</figcaption>
          <Frame theme={t.id} store={store} ui={ui} act={act} session={session} />
        </figure>
      ))}
    </div>
  )
}

function Frame({ theme, store, ui, act, session }: FramesProps & { theme: ThemePref }) {
  const [provider] = useState(() => memoryProvider(withTheme(store(), theme)))
  const [api] = useState(() => session?.())
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
      <TallyApp provider={provider} session={api} initialUi={ui} embedded />
    </div>
  )
}

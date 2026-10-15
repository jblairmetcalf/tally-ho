import type { Store, ThemePref } from '@tally/core'
import { useState } from 'react'
import { withTheme } from './fixtures'
import { memoryProvider } from './provider'
import type { UiState } from './store'
import { TallyApp } from './TallyApp'

export interface FramesProps {
  store: () => Store
  ui?: Partial<UiState>
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
export function Frames({ store, ui }: FramesProps) {
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 24, alignItems: 'flex-start' }}
    >
      {THEMES.map((t) => (
        <figure key={t.id} style={{ margin: 0 }}>
          <figcaption className="sb-label">{t.label}</figcaption>
          <Frame theme={t.id} store={store} ui={ui} />
        </figure>
      ))}
    </div>
  )
}

function Frame({ theme, store, ui }: FramesProps & { theme: ThemePref }) {
  const [provider] = useState(() => memoryProvider(withTheme(store(), theme)))
  return (
    <div
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

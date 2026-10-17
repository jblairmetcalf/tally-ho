// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { COPY } from '../copy'
import { fixedClock, SCENARIOS } from '../fixtures'
import { memoryProvider } from '../provider'
import { TallyApp } from '../TallyApp'
import { createCloudProvider, type Rejection } from './cloudProvider'
import { FakeBackend } from './fake'
import { demoSession, type SessionApi } from './session'
import { memoryStorage } from './storage'
import { KATE, seedFamily } from './testkit'

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  window.scrollTo = () => {}
})
afterEach(cleanup)

const app = (props: Parameters<typeof TallyApp>[0]) => (
  <TallyApp clock={fixedClock} silent embedded {...props} />
)

describe('TallyApp session wiring', () => {
  it('a refused family write shows the sync-rejected toast', () => {
    const backend = new FakeBackend()
    seedFamily(backend)
    const provider = createCloudProvider({
      member: KATE,
      db: backend.client(),
      storage: memoryStorage(),
    })
    const hooks: ((r: Rejection) => void)[] = []
    const real = provider.onRejected
    provider.onRejected = (cb) => {
      hooks.push(cb)
      return real(cb)
    }
    const session: SessionApi = demoSession({
      enabled: true,
      session: { mode: 'family', member: KATE },
      provider,
      sync: { state: 'synced', lastSyncedAt: 0 },
    })
    const { container } = render(app({ session }))
    expect(hooks).toHaveLength(1)
    act(() =>
      hooks[0]?.({
        op: { type: 'update', col: 'games', id: 'g', data: {} },
        error: Object.assign(new Error('no'), { code: 'permission-denied' }),
      }),
    )
    expect(container.textContent).toContain(COPY.toast.syncRejected)
    provider.dispose()
  })

  it('a new session (sign-in/out) swaps in a fresh store over its provider', () => {
    const a = demoSession({ provider: memoryProvider(SCENARIOS.flip7Race()) })
    const { container, rerender } = render(app({ session: a }))
    expect(container.textContent).toContain('Flip 7')
    const b = demoSession({ provider: memoryProvider(SCENARIOS.empty()) })
    rerender(app({ session: b }))
    expect(container.textContent).not.toContain('Flip 7')
  })

  it('an explicit provider (stories) still renders, with a demo session', () => {
    const { container } = render(app({ provider: memoryProvider(SCENARIOS.flip7Race()) }))
    expect(container.textContent).toContain('Flip 7')
  })
})

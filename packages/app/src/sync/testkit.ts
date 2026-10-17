// Test helpers for sync (not part of the app bundle: only *.test.ts import this).
import { type Clock, DEFAULT_PLAYERS, DEFAULT_PRESETS, type Store } from '@tally/core'
import { createEffects } from '../effects'
import { createTallyStore } from '../store'
import { createCloudProvider, type Member } from './cloudProvider'
import { playerDoc, presetDoc } from './docs'
import type { FakeBackend } from './fake'
import { memoryStorage } from './storage'

export const T0 = Date.UTC(2026, 9, 12, 19, 30)

/** Let microtasks and zero-delay timers (snapshot delivery, coalesced emits) run out. */
export async function settle(rounds = 25) {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setTimeout(r, 0))
}

/** A clock that ticks a second per read, offset so two phones never mint the same id. */
export function tickingClock(offset: number, step = 2000): Clock {
  let t = T0 + offset
  return { now: () => (t += step) }
}

/** What sign-in seeds: the default players and presets. */
export function seedFamily(backend: FakeBackend) {
  const updatedAt = new Date(T0).toISOString()
  for (const p of DEFAULT_PLAYERS) backend.put('players', p.id, { ...playerDoc(p), updatedAt })
  for (const p of DEFAULT_PRESETS) backend.put('presets', p.id, { ...presetDoc(p), updatedAt })
}

export const KATE: Member = { email: 'kate@example.com', name: 'Kate', playerId: 'kate' }
export const BLAIR: Member = { email: 'blair@example.com', name: 'Blair', playerId: 'blair' }

/** One phone: its own Firestore client, mirror, provider and store. */
export function phone(backend: FakeBackend, member: Member, offset = 0) {
  const db = backend.client()
  const storage = memoryStorage()
  const clock = tickingClock(offset)
  const provider = createCloudProvider({
    member,
    db,
    storage,
    clock,
    online: () => !db.offline,
    onError: () => {},
  })
  const saves: Store[] = []
  const save = provider.save
  provider.save = (s) => {
    saves.push(s)
    save(s)
  }
  const store = createTallyStore(provider, clock, {
    effects: createEffects({ silent: true, scroll: false }),
  })
  return {
    db,
    storage,
    provider,
    store,
    saves,
    a: store.getState().actions,
    s: () => store.getState(),
    data: () => store.getState().data,
    dispose() {
      store.getState().actions.dispose()
      provider.dispose()
    },
  }
}
export type Phone = ReturnType<typeof phone>

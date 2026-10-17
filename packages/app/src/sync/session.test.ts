import type { Store } from '@tally/core'
import { afterEach, describe, expect, it } from 'vitest'
import { memoryProvider, STORAGE_KEY } from '../provider'
import type { FirebaseConfig } from './config'
import { FakeAuth, FakeBackend, type FakeFirestore } from './fake'
import { createSessionCore, SignInError, signInErrorOf } from './session'
import { MIRROR_KEY, memoryStorage, OUTBOX_KEY, SESSION_KEY } from './storage'
import { KATE, seedFamily, settle, tickingClock } from './testkit'

const config: FirebaseConfig = { apiKey: 'k', authDomain: 'd', projectId: 'demo-tally', appId: 'a' }

function setup(opts: { members?: boolean; seeded?: boolean } = {}) {
  const backend = new FakeBackend()
  if (opts.seeded) seedFamily(backend)
  if (opts.members !== false)
    backend.put('members', KATE.email, { name: KATE.name, playerId: KATE.playerId })
  const auth = new FakeAuth({ [KATE.email]: 'secret', 'stranger@example.com': 'secret' })
  const db: FakeFirestore = backend.client()
  const storage = memoryStorage()
  let connects = 0
  const core = (over: { storage?: typeof storage } = {}) =>
    createSessionCore({
      config,
      connect: async () => {
        connects++
        return { db, auth }
      },
      storage: over.storage ?? storage,
      clock: tickingClock(0),
      online: () => !db.offline,
      demoProvider: () => memoryProvider(),
    })
  return { backend, auth, db, storage, core, connects: () => connects }
}

const live: { getSnapshot(): { signOut(): Promise<void> } }[] = []
afterEach(async () => {
  live.splice(0)
})

describe('session', () => {
  it('is demo-only without a Firebase config, and never loads it', () => {
    let connected = false
    const core = createSessionCore({
      config: null,
      storage: memoryStorage(),
      connect: async () => {
        connected = true
        throw new Error('no')
      },
    })
    const api = core.getSnapshot()
    expect(api.enabled).toBe(false)
    expect(api.session).toEqual({ mode: 'demo' })
    expect(api.sync).toBeNull()
    expect(connected).toBe(false)
  })

  it('starts in demo and does not touch Firebase until asked', () => {
    const { core, connects } = setup()
    const api = core().getSnapshot()
    expect(api.enabled).toBe(true)
    expect(api.session.mode).toBe('demo')
    expect(connects()).toBe(0)
  })

  it('signs a member in, remembers them, and seeds the family once', async () => {
    const { core, storage, backend } = setup()
    const c = core()
    await c.getSnapshot().signIn('  Kate@Example.com ', 'secret')
    const api = c.getSnapshot()
    expect(api.session).toEqual({ mode: 'family', member: KATE })
    expect(JSON.parse(storage.getItem(SESSION_KEY)!)).toEqual(KATE)
    expect([...(backend.docs.get('players')?.keys() ?? [])]).toEqual(['kate', 'blair', 'alder'])
    expect(backend.docs.get('presets')?.get('mille-bornes')).toMatchObject({
      name: 'Mille Bornes',
      updatedAt: expect.any(String),
    })
    const writes = backend.log.length
    await api.signOut()
    await c.getSnapshot().signIn(KATE.email, 'secret')
    expect(backend.log.length).toBe(writes) // already seeded: nothing written
    expect(api.provider).not.toBe(c.getSnapshot().provider)
  })

  it('does not reseed a family that has players already', async () => {
    const { core, backend } = setup({ seeded: true })
    backend.put('players', 'kate', { id: 'kate', name: 'Katie', color: 3, updatedAt: 'x' })
    await core().getSnapshot().signIn(KATE.email, 'secret')
    expect(backend.get('players', 'kate')?.name).toBe('Katie')
    expect(backend.log).toHaveLength(0)
  })

  it('turns away someone who is not in the family', async () => {
    const { core, auth, storage } = setup()
    const c = core()
    const err = await c
      .getSnapshot()
      .signIn('stranger@example.com', 'secret')
      .catch((e: unknown) => e)
    expect(err).toBeInstanceOf(SignInError)
    expect((err as SignInError).code).toBe('not-family')
    expect(auth.user).toBeNull()
    expect(c.getSnapshot().session.mode).toBe('demo')
    expect(storage.getItem(SESSION_KEY)).toBeNull()
  })

  it('a refused members read also means not-family', async () => {
    const { core, db } = setup()
    db.getServer = async () => {
      throw Object.assign(new Error('denied'), { code: 'permission-denied' })
    }
    await expect(core().getSnapshot().signIn(KATE.email, 'secret')).rejects.toMatchObject({
      code: 'not-family',
    })
  })

  it('maps sign-in failures', async () => {
    const { core, auth } = setup()
    const c = core()
    await expect(c.getSnapshot().signIn(KATE.email, 'wrong')).rejects.toMatchObject({
      code: 'wrong-credentials',
    })
    auth.offline = true
    await expect(c.getSnapshot().signIn(KATE.email, 'secret')).rejects.toMatchObject({
      code: 'offline',
    })
    expect(signInErrorOf({ code: 'auth/too-many-requests' }).code).toBe('too-many-attempts')
    expect(signInErrorOf({ code: 'auth/wrong-password' }).code).toBe('wrong-credentials')
    expect(signInErrorOf({ code: 'auth/user-not-found' }).code).toBe('wrong-credentials')
    expect(signInErrorOf(new Error('?')).code).toBe('unknown')
  })

  it('an SDK that cannot load (offline) is an offline error', async () => {
    const core = createSessionCore({
      config,
      storage: memoryStorage(),
      connect: () => Promise.reject(new Error('chunk failed')),
    })
    await expect(core.getSnapshot().signIn(KATE.email, 'x')).rejects.toMatchObject({
      code: 'offline',
    })
  })

  it('boots straight into family from the flag and the mirror, then verifies', async () => {
    const { core, storage, auth, connects } = setup({ seeded: true })
    await core().getSnapshot().signIn(KATE.email, 'secret')
    const mirrored = { ...(core().getSnapshot().provider.load() as Store), lastPlayerIds: ['x'] }
    storage.setItem(MIRROR_KEY, JSON.stringify(mirrored))
    const before = connects()
    const c = core()
    expect(c.getSnapshot().session).toEqual({ mode: 'family', member: KATE })
    expect(c.getSnapshot().provider.load()?.lastPlayerIds).toEqual(['x'])
    expect(connects()).toBe(before) // nothing loaded yet: first paint is synchronous
    const stop = c.start()
    await settle()
    expect(c.getSnapshot().session.mode).toBe('family')
    stop()
    // Auth lost the user: back to the demo.
    auth.user = null
    const d = core()
    d.start()
    await settle()
    expect(d.getSnapshot().session.mode).toBe('demo')
    expect(storage.getItem(SESSION_KEY)).toBeNull()
  })

  it('a member removed from the family is signed out on the next launch', async () => {
    const { core, backend } = setup()
    const c = core()
    await c.getSnapshot().signIn(KATE.email, 'secret')
    backend.docs.get('members')?.delete(KATE.email)
    const d = core()
    d.start()
    await settle()
    expect(d.getSnapshot().session.mode).toBe('demo')
  })

  it('offline at launch: stays in family mode', async () => {
    const { core, db } = setup()
    await core().getSnapshot().signIn(KATE.email, 'secret')
    db.setOffline(true)
    const c = core()
    c.start()
    await settle()
    expect(c.getSnapshot().session.mode).toBe('family')
    expect(c.getSnapshot().sync?.state).toBe('offline')
  })

  it('reports sync status in family mode', async () => {
    const { core } = setup({ seeded: true })
    const c = core()
    let calls = 0
    c.subscribe(() => calls++)
    await c.getSnapshot().signIn(KATE.email, 'secret')
    const store = c.getSnapshot().provider
    store.subscribe?.(() => {})
    await settle()
    expect(c.getSnapshot().sync?.state).toBe('synced')
    expect(calls).toBeGreaterThan(1)
  })

  it('sign-out terminates Firestore, clears the mirror and flag, and resets the demo', async () => {
    const { core, storage, db, auth } = setup({ seeded: true })
    const c = core()
    await c.getSnapshot().signIn(KATE.email, 'secret')
    c.getSnapshot().provider.save({
      ...(c.getSnapshot().provider.load() as Store),
      lastPlayerIds: [],
    })
    expect(storage.getItem(MIRROR_KEY)).not.toBeNull()
    storage.setItem(OUTBOX_KEY, '[]')
    storage.setItem(STORAGE_KEY, JSON.stringify({ junk: true }))
    await c.getSnapshot().signOut()
    expect(db.terminated).toBe(1)
    expect(auth.user).toBeNull()
    expect(storage.getItem(MIRROR_KEY)).toBeNull()
    expect(storage.getItem(SESSION_KEY)).toBeNull()
    expect(storage.getItem(OUTBOX_KEY)).toBeNull()
    const demo = JSON.parse(storage.getItem(STORAGE_KEY)!)
    expect(demo.hasSamples).toBe(true)
    expect(demo.games).toHaveLength(10)
    expect(c.getSnapshot().session).toEqual({ mode: 'demo' })
    expect(c.getSnapshot().sync).toBeNull()
  })

  it('resetDemo writes fresh samples and swaps the demo provider', () => {
    const { core, storage } = setup()
    const c = core()
    const before = c.getSnapshot().provider
    c.getSnapshot().resetDemo()
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).games).toHaveLength(10)
    expect(c.getSnapshot().provider).not.toBe(before)
  })

  it('passes password resets through', async () => {
    const { core, auth } = setup()
    await core().getSnapshot().sendPasswordReset(' Kate@example.com')
    expect(auth.resets).toEqual(['kate@example.com'])
  })
})

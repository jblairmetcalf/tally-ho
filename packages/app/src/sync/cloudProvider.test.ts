import { type Store, totalsOf } from '@tally/core'
import { afterEach, describe, expect, it } from 'vitest'
import type { NewGameConfig } from '../store'
import { createCloudProvider, type SyncStatus } from './cloudProvider'
import { FakeBackend, finishedGamesAreFinal } from './fake'
import { readOutbox } from './outbox'
import { MIRROR_KEY, memoryStorage } from './storage'
import { BLAIR, KATE, type Phone, phone, seedFamily, settle, T0, tickingClock } from './testkit'

const flip7: NewGameConfig = {
  name: 'Flip 7',
  goal: 'score',
  target: 200,
  lowWins: false,
  playerIds: ['kate', 'blair', 'alder'],
}

const open: Phone[] = []
function family() {
  const backend = new FakeBackend()
  seedFamily(backend)
  const k = phone(backend, KATE, 0)
  const b = phone(backend, BLAIR, 1000)
  open.push(k, b)
  return { backend, k, b }
}
afterEach(() => {
  for (const p of open.splice(0)) p.dispose()
})

const writesSince = (backend: FakeBackend, n: number) => backend.log.slice(n)

describe('cloudProvider', () => {
  it('a new round is exactly one write: rounds.<id>, stamped with the scorer', async () => {
    const { backend, k } = family()
    await settle()
    k.a.startGame(flip7)
    await settle()
    const n = backend.log.length
    k.a.submitRound(['10', '20', '30'])
    await settle()
    const w = writesSince(backend, n)
    expect(w).toHaveLength(1)
    const rid = k.data().active?.rounds[0]?.id
    expect(w[0]).toMatchObject({ kind: 'update', col: 'games' })
    expect(w[0]?.kind === 'update' && Object.keys(w[0].data).sort()).toEqual([
      `rounds.${rid}`,
      'updatedAt',
    ])
    const doc = backend.get('games', k.data().active!.id)
    expect(doc?.rounds).toEqual({
      [rid!]: { scores: { kate: 10, blair: 20, alder: 30 }, at: expect.any(String), by: 'kate' },
    })
    expect(doc?.startedBy).toBe('kate')
    expect(readOutbox(k.storage)).toEqual([])
    // The echo fills `by` locally too.
    expect(k.data().active?.rounds[0]?.by).toBe('kate')
  })

  it('two phones scoring at once keep both rounds', async () => {
    const { k, b } = family()
    await settle()
    k.a.startGame(flip7)
    await settle()
    expect(b.data().active?.name).toBe('Flip 7')
    k.a.submitRound(['1', '2', '3'])
    b.a.submitRound(['4', '5', '6'])
    await settle()
    for (const p of [k, b]) {
      expect(p.data().active?.rounds).toHaveLength(2)
      expect(totalsOf(p.data().active!)).toEqual({ kate: 5, blair: 7, alder: 9 })
    }
    expect(
      k
        .data()
        .active?.rounds.map((r) => r.by)
        .sort(),
    ).toEqual(['blair', 'kate'])
    expect(k.data()).toEqual({ ...b.data(), prefs: k.data().prefs })
  })

  it('offline: writes wait on the phone, flush when back, and reach the other phone', async () => {
    const { backend, k, b } = family()
    const states: SyncStatus['state'][] = []
    k.provider.watchStatus((s) => states.push(s.state))
    await settle()
    k.a.startGame(flip7)
    await settle()
    expect(states.at(-1)).toBe('synced')

    k.db.setOffline(true)
    k.a.submitRound(['7', '0', '0'])
    k.a.submitRound(['7', '0', '0'])
    await settle()
    expect(states.at(-1)).toBe('offline')
    expect(k.db.pendingCount).toBe(2)
    expect(b.data().active?.rounds).toHaveLength(0)
    expect(Object.keys(backend.get('games', k.data().active!.id)?.rounds as object)).toHaveLength(0)

    k.db.setOffline(false)
    await settle()
    expect(k.db.pendingCount).toBe(0)
    expect(states.at(-1)).toBe('synced')
    expect(b.data().active?.rounds).toHaveLength(2)
    expect(b.s().flash?.scores).toEqual({ kate: 7, blair: 0, alder: 0 })
  })

  it('a remote change is not echoed back as a save', async () => {
    const { backend, k, b } = family()
    await settle()
    k.a.startGame(flip7)
    k.a.submitRound(['1', '1', '1'])
    await settle()
    const n = backend.log.length
    const saves = b.saves.length
    k.a.submitRound(['2', '2', '2'])
    await settle()
    expect(b.data().active?.rounds).toHaveLength(2)
    expect(b.saves.length).toBe(saves)
    expect(writesSince(backend, n)).toHaveLength(1)
  })

  it('prefs and lastPlayerIds stay on the phone (mirrored, never written)', async () => {
    const { backend, k } = family()
    await settle()
    const n = backend.log.length
    k.a.setPref('theme', 'light')
    k.a.startGame({ ...flip7, playerIds: ['blair', 'alder'] })
    await settle()
    const w = writesSince(backend, n)
    expect(w.map((x) => x.col)).toEqual(['games'])
    expect(JSON.stringify(w.map(({ client: _c, ...x }) => x))).not.toContain('light')
    const mirror = JSON.parse(k.storage.getItem(MIRROR_KEY) ?? '{}')
    expect(mirror.prefs.theme).toBe('light')
    expect(mirror.lastPlayerIds).toEqual(['blair', 'alder'])
  })

  it('loads synchronously from the mirror, then follows the server', async () => {
    const backend = new FakeBackend()
    seedFamily(backend)
    const storage = memoryStorage()
    const first = createCloudProvider({ member: KATE, db: backend.client(), storage })
    expect(first.load()?.players.map((p) => p.id)).toEqual(['kate', 'blair', 'alder'])
    first.save({ ...first.load()!, prefs: { ...first.load()!.prefs, muted: true } })
    first.dispose()
    // A lazily loaded Firestore: load() still answers at once, from the mirror.
    let resolveDb: () => void = () => {}
    const db = backend.client()
    const second = createCloudProvider({
      member: KATE,
      db: () => new Promise((r) => (resolveDb = () => r(db))),
      storage,
    })
    expect(second.load()?.prefs.muted).toBe(true)
    const seen: string[][] = []
    second.subscribe((s) => seen.push(s.players.map((p) => p.name)))
    backend.put('players', 'kate', { id: 'kate', name: 'Katie', color: 0, updatedAt: 'x' })
    resolveDb()
    await settle()
    expect(seen.at(-1)).toEqual(['Katie', 'Blair', 'Alder'])
    expect(JSON.parse(storage.getItem(MIRROR_KEY)!).players[0].name).toBe('Katie')
    second.dispose()
  })

  it('keeps writes queued when the SDK cannot load yet, and sends them in order later', async () => {
    const backend = new FakeBackend()
    seedFamily(backend)
    const db = backend.client()
    let fail = true
    const p = createCloudProvider({
      member: KATE,
      db: () => (fail ? Promise.reject(new Error('chunk failed')) : Promise.resolve(db)),
      storage: memoryStorage(),
      onError: () => {},
    })
    const s0 = p.load()!
    const renamed = { ...s0, players: s0.players.map((x) => ({ ...x, name: `${x.name}1` })) }
    p.save(renamed)
    await settle()
    expect(backend.log).toHaveLength(0)
    fail = false
    p.save({ ...renamed, players: renamed.players.map((x) => ({ ...x, color: 5 })) })
    await settle()
    expect(backend.log.map((w) => w.kind === 'update' && Object.keys(w.data)[0])).toEqual([
      'name',
      'name',
      'name',
      'color',
      'color',
      'color',
    ])
    expect(backend.get('players', 'kate')).toMatchObject({ name: 'Kate1', color: 5 })
    p.dispose()
  })

  it('killed before the SDK loaded: the next launch replays the outbox', async () => {
    const backend = new FakeBackend()
    seedFamily(backend)
    const storage = memoryStorage()
    // First launch: offline on a cold cache, the SDK never loads.
    const first = createCloudProvider({
      member: KATE,
      db: () => new Promise(() => {}),
      storage,
      clock: tickingClock(0),
    })
    const s0 = first.load()!
    const g = {
      id: 'g1',
      name: 'Flip 7',
      goal: 'score' as const,
      target: 200,
      lowWins: false,
      playerIds: ['kate', 'blair'],
      rounds: [],
      startedAt: new Date(T0).toISOString(),
      completedAt: null,
      winnerId: null,
    }
    first.save({ ...s0, active: g })
    first.save({ ...s0, active: { ...g, rounds: [{ id: 'r1', scores: { kate: 5, blair: 2 } }] } })
    expect(readOutbox(storage).map((e) => e.type)).toEqual(['set', 'update'])
    first.dispose() // iOS kills the app
    expect(backend.get('games', 'g1')).toBeUndefined()

    // Next launch, online.
    const second = createCloudProvider({ member: KATE, db: backend.client(), storage })
    expect(second.load()?.active?.rounds).toHaveLength(1) // from the mirror
    await settle()
    expect(backend.get('games', 'g1')).toMatchObject({
      startedBy: 'kate',
      updatedAt: expect.any(String),
      rounds: { r1: { scores: { kate: 5, blair: 2 }, by: 'kate' } },
    })
    expect(readOutbox(storage)).toEqual([])
    second.dispose()
  })

  it('a snapshot that lacks an unconfirmed write does not revert it', async () => {
    const backend = new FakeBackend()
    seedFamily(backend)
    const storage = memoryStorage()
    const db = backend.client()
    const update = db.update.bind(db)
    // The cache dies under this write (iOS IndexedDB): Firestore never takes it.
    db.update = () =>
      Promise.reject(Object.assign(new Error('IndexedDB lost'), { code: 'failed-precondition' }))
    const p = createCloudProvider({ member: KATE, db, storage, onError: () => {} })
    const seen: Store[] = []
    p.subscribe((s) => seen.push(s))
    await settle()
    const s0 = p.load()!
    p.save({ ...s0, players: s0.players.map((x) => (x.id === 'kate' ? { ...x, color: 6 } : x)) })
    await settle()
    expect(readOutbox(storage)).toHaveLength(1)
    // Someone else renames Blair: the snapshot doesn't have Kate's colour, the screen keeps it.
    backend.put('players', 'blair', { id: 'blair', name: 'B', color: 1, updatedAt: 'x' })
    await settle()
    const last = seen.at(-1)!
    expect(last.players.find((x) => x.id === 'blair')?.name).toBe('B')
    expect(last.players.find((x) => x.id === 'kate')?.color).toBe(6)
    p.dispose()
    // Next launch the write goes through.
    db.update = update
    const again = createCloudProvider({ member: KATE, db: backend.client(), storage })
    await settle()
    expect(backend.get('players', 'kate')?.color).toBe(6)
    expect(readOutbox(storage)).toEqual([])
    again.dispose()
  })

  it('a refused write leaves the outbox (and the screen goes back)', async () => {
    const { backend, k } = family()
    backend.rules = ({ write }) => write.col !== 'presets'
    await settle()
    k.a.deletePreset('uno')
    await settle()
    expect(readOutbox(k.storage)).toEqual([])
    expect(k.data().presets.some((p) => p.id === 'uno')).toBe(true)
  })

  it('soft-deletes discarded games; the other phone goes home', async () => {
    const { backend, k, b } = family()
    await settle()
    k.a.startGame(flip7)
    await settle()
    b.a.resume()
    const id = k.data().active!.id
    k.a.discardGame()
    await settle()
    expect(backend.get('games', id)?.deletedAt).toEqual(expect.any(String))
    expect(b.data().active).toBeNull()
    expect(b.s().screen).toBe('home')
  })

  it('a write the rules refuse is reported and rolled back', async () => {
    const { backend, k, b } = family()
    backend.rules = finishedGamesAreFinal
    const rejected: string[] = []
    b.provider.onRejected((r) => rejected.push(r.error.code ?? ''))
    await settle()
    k.a.startGame({ ...flip7, target: 50 })
    k.a.submitRound(['10', '0', '0'])
    await settle()
    b.db.setOffline(true)
    b.a.submitRound(['0', '5', '0']) // a late round, scored offline
    k.a.submitRound(['60', '0', '0']) // Kate wins meanwhile
    await settle()
    expect(k.data().games[0]?.winnerId).toBe('kate')
    b.db.setOffline(false)
    await settle()
    expect(rejected).toEqual(['permission-denied'])
    expect(b.data().active).toBeNull()
    expect(b.data().games[0]?.rounds).toHaveLength(2)
    expect(b.data().games).toEqual(k.data().games)
  })

  it('"Who won?": winner rounds sync, and the deciding win lands with the result in one write', async () => {
    const { backend, k, b } = family()
    backend.rules = finishedGamesAreFinal
    await settle()
    k.a.startGame({ ...flip7, name: 'Jaipur', goal: 'wins', target: 2 })
    await settle()
    expect(b.data().active).toMatchObject({ goal: 'wins', target: 2 })
    k.a.submitWinner('blair')
    await settle()
    expect(b.data().active?.rounds).toHaveLength(1)
    const n = backend.log.length
    b.a.submitWinner('blair') // Blair's second Seal, scored on her own phone
    await settle()
    const w = writesSince(backend, n)
    expect(w).toHaveLength(1)
    expect(w[0]?.kind === 'update' && Object.keys(w[0].data)).toEqual(
      expect.arrayContaining(['completedAt', 'winnerId']),
    )
    expect(k.data().games[0]).toMatchObject({ name: 'Jaipur', winnerId: 'blair' })
    const g = k.data().games[0]!
    expect(g.rounds.map((r) => r.scores)).toEqual([
      { kate: 0, blair: 1, alder: 0 },
      { kate: 0, blair: 1, alder: 0 },
    ])
    expect(backend.get('games', g.id)).toMatchObject({ goal: 'wins', winnerId: 'blair' })
    expect(b.data().games).toEqual(k.data().games)
  })

  it('a tie settled by the game’s tiebreak crowns one leader on both phones', async () => {
    const { backend, k, b } = family()
    backend.rules = finishedGamesAreFinal
    await settle()
    k.a.startGame({ ...flip7, name: 'Uno', goal: 'wins', target: 1 })
    k.a.submitRound(['1', '1', '0']) // a tie at the target: no finish yet
    await settle()
    expect(b.data().active?.rounds).toHaveLength(1)
    b.a.crownWinner('kate')
    await settle()
    expect(k.data().active).toBeNull()
    expect(k.data().games[0]?.winnerId).toBe('kate')
    expect(k.data().games).toEqual(b.data().games)
  })

  it('a one-round-per-player preset syncs its flag, and clearing it reaches the other phone', async () => {
    const { backend, k, b } = family()
    await settle()
    // A game of our own: no default uses the flag (the family plays Scout as "Who won?").
    const rr = {
      id: 'round-robin',
      name: 'Round Robin',
      goal: 'rounds' as const,
      target: 3,
      lowWins: false,
      roundsPerPlayer: true,
    }
    k.a.upsertPreset(rr)
    await settle()
    expect(b.data().presets.find((p) => p.id === 'round-robin')?.roundsPerPlayer).toBe(true)
    k.a.upsertPreset({ ...rr, roundsPerPlayer: undefined, target: 4 })
    await settle()
    expect(backend.get('presets', 'round-robin')).not.toHaveProperty('roundsPerPlayer')
    expect(b.data().presets.find((p) => p.id === 'round-robin')).toMatchObject({ target: 4 })
    expect(b.data().presets.find((p) => p.id === 'round-robin')?.roundsPerPlayer).toBeUndefined()
    b.a.upsertPreset({ ...rr, roundsPerPlayer: true })
    await settle()
    expect(backend.get('presets', 'round-robin')?.roundsPerPlayer).toBe(true)
    expect(k.data().presets.find((p) => p.id === 'round-robin')?.roundsPerPlayer).toBe(true)
  })

  it('the Mixtape: a key reaches the other phone and rides on the game; playing writes nothing', async () => {
    const { backend, k, b } = family()
    await settle()
    // Flip 7 gets its own key; a game dealt from it keeps that key.
    const flip = k.data().presets.find((p) => p.name === 'Flip 7')!
    const key = { tonic: 9, mode: 'minor' as const, loop: 1 }
    k.a.upsertPreset({ ...flip, song: key })
    await settle()
    expect(b.data().presets.find((p) => p.id === flip.id)?.song).toEqual(key)
    k.a.startGame({ ...flip7, target: 20 })
    await settle()
    k.a.submitRound(['25', '0', '0'])
    await settle()
    const id = k.data().games[0]!.id
    expect(backend.get('games', id)?.song).toEqual(key)
    // A song is computed from the rounds: playing it writes nothing.
    const n = backend.log.length
    k.a.playSong(id)
    await settle()
    expect(backend.log.length).toBe(n)
  })
})

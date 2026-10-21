import { emptyStore, type Game, type Store, withRoundIds } from '@tally/core'
import { describe, expect, it } from 'vitest'
import { DELETE, diff, NOW } from './diff'
import {
  deepEqual,
  gameDoc,
  gameFrom,
  naturalCompare,
  presetDoc,
  presetFrom,
  splitGames,
} from './docs'

const at = (m: number) => new Date(Date.UTC(2026, 9, 12, 19, m)).toISOString()

const game = (over: Partial<Game> = {}): Game => ({
  id: 'g1',
  name: 'Flip 7',
  goal: 'score',
  target: 200,
  lowWins: false,
  playerIds: ['kate', 'blair'],
  rounds: [],
  startedAt: at(0),
  completedAt: null,
  winnerId: null,
  ...over,
})

const base = (over: Partial<Store> = {}): Store => ({ ...emptyStore(), ...over })

describe('diff', () => {
  it('writes nothing when nothing synced changed (prefs and lastPlayerIds stay local)', () => {
    const a = base({ active: game() })
    const b = { ...a, prefs: { ...a.prefs, muted: true }, lastPlayerIds: ['blair'] }
    expect(diff(a, b, 'kate')).toEqual([])
    expect(diff(a, structuredClone(a), 'kate')).toEqual([])
  })

  it('a new game is one full document, stamped with who started it', () => {
    const ops = diff(base(), base({ active: game() }), 'kate')
    expect(ops).toEqual([
      {
        type: 'set',
        col: 'games',
        id: 'g1',
        data: {
          id: 'g1',
          name: 'Flip 7',
          goal: 'score',
          target: 200,
          lowWins: false,
          playerIds: ['kate', 'blair'],
          startedAt: at(0),
          completedAt: null,
          winnerId: null,
          startedBy: 'kate',
          rounds: {},
        },
      },
    ])
  })

  it('a new round is one map field, stamped with who scored it', () => {
    const a = base({ active: game() })
    const r = { id: 'r1', scores: { kate: 3, blair: null }, at: at(1) }
    const ops = diff(a, base({ active: game({ rounds: [r] }) }), 'blair')
    expect(ops).toEqual([
      {
        type: 'update',
        col: 'games',
        id: 'g1',
        data: { 'rounds.r1': { scores: { kate: 3, blair: null }, at: at(1), by: 'blair' } },
      },
    ])
  })

  it('an edit keeps the original scorer; a delete clears the field', () => {
    const r1 = { id: 'r1', scores: { kate: 3, blair: 1 }, at: at(1), by: 'kate' }
    const r2 = { id: 'r2', scores: { kate: 4, blair: 2 }, at: at(2), by: 'kate' }
    const a = base({ active: game({ rounds: [r1, r2] }) })
    const b = base({
      active: game({ rounds: [{ id: 'r1', scores: { kate: 9, blair: 1 }, at: at(1) }] }),
    })
    const [op] = diff(a, b, 'blair')
    expect(op?.type === 'update' && op.data).toEqual({
      'rounds.r1': { scores: { kate: 9, blair: 1 }, at: at(1), by: 'kate' },
      'rounds.r2': DELETE,
    })
  })

  it('finishing writes the last round and the result in one update', () => {
    const live = game({ rounds: [{ id: 'r1', scores: { kate: 100, blair: 0 }, at: at(1) }] })
    const done = game({
      rounds: [...live.rounds, { id: 'r2', scores: { kate: 120, blair: 0 }, at: at(2) }],
      completedAt: at(3),
      winnerId: 'kate',
    })
    const ops = diff(base({ active: live }), base({ games: [done] }), 'kate')
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({
      type: 'update',
      data: { completedAt: at(3), winnerId: 'kate', 'rounds.r2': expect.anything() },
    })
  })

  it('soft-deletes games, never deletes players, hard-deletes presets', () => {
    const a = base({ active: game() })
    const b = {
      ...base(),
      players: a.players.slice(1),
      presets: a.presets.filter((p) => p.id !== 'uno'),
    }
    expect(diff(a, b, 'kate')).toEqual([
      { type: 'delete', col: 'presets', id: 'uno' },
      { type: 'update', col: 'games', id: 'g1', data: { deletedAt: NOW } },
    ])
  })

  it('player fields change one by one; un-archiving clears the flag', () => {
    const a = base()
    const archived = { ...a, players: a.players.map((p) => ({ ...p, archived: true })) }
    const ops = diff(archived, a, 'kate')
    expect(ops).toHaveLength(3)
    expect(ops[0]).toEqual({
      type: 'update',
      col: 'players',
      id: 'kate',
      data: { archived: DELETE },
    })
    const renamed = { ...a, players: a.players.map((p) => ({ ...p, name: `${p.name}!` })) }
    expect(diff(a, renamed, 'kate')[0]).toEqual({
      type: 'update',
      col: 'players',
      id: 'kate',
      data: { name: 'Kate!' },
    })
  })

  it('presets carry roundsPerPlayer; turning it off clears the field', () => {
    // A one-round-per-player game of our own (no default uses the flag).
    const rr = {
      id: 'round-robin',
      name: 'Round Robin',
      goal: 'rounds' as const,
      target: 3,
      lowWins: false,
      roundsPerPlayer: true,
    }
    const a = { ...base(), presets: [...base().presets, rr] }
    const custom = { id: 'p1', name: 'Hearts', goal: 'rounds' as const, target: 4, lowWins: true }
    const withNew = { ...a, presets: [...a.presets, { ...custom, roundsPerPlayer: true }] }
    expect(diff(a, withNew, 'kate')).toEqual([
      {
        type: 'set',
        col: 'presets',
        id: 'p1',
        data: { ...custom, roundsPerPlayer: true },
      },
    ])
    const off = {
      ...a,
      presets: a.presets.map((p) =>
        p.id === 'round-robin' ? { ...p, roundsPerPlayer: undefined } : p,
      ),
    }
    expect(diff(a, off, 'kate')).toEqual([
      { type: 'update', col: 'presets', id: 'round-robin', data: { roundsPerPlayer: DELETE } },
    ])
    expect(diff(off, a, 'kate')).toEqual([
      { type: 'update', col: 'presets', id: 'round-robin', data: { roundsPerPlayer: true } },
    ])
    // A preset without the flag writes no key (old clients' docs look the same).
    expect('roundsPerPlayer' in presetDoc(custom)).toBe(false)
  })

  it('presets carry player limits: set, changed, "no limit" as null, and read back', () => {
    const a = base()
    const fox = a.presets.find((p) => p.id === 'the-fox-in-the-forest')!
    expect(presetDoc(fox)).toMatchObject({ minPlayers: 2, maxPlayers: 2 })
    const opened = {
      ...a,
      presets: a.presets.map((p) => (p.id === fox.id ? { ...p, maxPlayers: null } : p)),
    }
    // "No limit" is a value (null), not a missing key: the family's choice must stick. The pair
    // always travels together, so the rules' max ≥ min check never meets another phone's half.
    expect(diff(a, opened, 'kate')).toEqual([
      { type: 'update', col: 'presets', id: fox.id, data: { minPlayers: 2, maxPlayers: null } },
    ])
    const flip = a.presets.find((p) => p.id === 'flip-7')!
    const fewest = {
      ...a,
      presets: a.presets.map((p) => (p.id === flip.id ? { ...p, minPlayers: 3 } : p)),
    }
    expect(diff(a, fewest, 'kate')).toEqual([
      { type: 'update', col: 'presets', id: flip.id, data: { minPlayers: 3, maxPlayers: DELETE } },
    ])
    const back = presetFrom(fox.id, {
      ...presetDoc({ ...fox, maxPlayers: null }),
      updatedAt: at(9),
    })
    expect(back).toMatchObject({ minPlayers: 2, maxPlayers: null })
    // An old doc without either key still reads (the app falls back to the built-in default).
    const { minPlayers: _a, maxPlayers: _b, ...old } = presetDoc(fox)
    expect(presetFrom(fox.id, old)).not.toBeNull()
    expect(presetFrom(fox.id, old)?.maxPlayers).toBeUndefined()
    // A preset without limits writes no keys.
    expect('minPlayers' in presetDoc(flip) || 'maxPlayers' in presetDoc(flip)).toBe(false)
  })

  it('a "Who won?" game syncs its goal, and a winner round is one map field', () => {
    const g = game({ name: 'Uno', goal: 'wins', target: 1 })
    const [set] = diff(base(), base({ active: g }), 'kate')
    expect(set).toMatchObject({ type: 'set', data: { goal: 'wins', target: 1 } })
    const r = { id: 'r1', scores: { kate: 1, blair: 0 }, at: at(1) }
    const done = game({
      name: 'Uno',
      goal: 'wins',
      target: 1,
      rounds: [r],
      completedAt: at(1),
      winnerId: 'kate',
    })
    expect(diff(base({ active: g }), base({ games: [done] }), 'kate')).toEqual([
      {
        type: 'update',
        col: 'games',
        id: 'g1',
        data: {
          completedAt: at(1),
          winnerId: 'kate',
          'rounds.r1': { scores: { kate: 1, blair: 0 }, at: at(1), by: 'kate' },
        },
      },
    ])
  })

  it('the Mixtape: a song key rides on presets and games (songs themselves are never stored)', () => {
    const key = { tonic: 7, mode: 'major' as const, loop: 2 }
    const g = game({ song: key })
    expect(diff(base(), base({ active: g }), 'kate')[0]).toMatchObject({ data: { song: key } })
    expect(gameFrom('g1', gameDoc(g))?.song).toEqual(key)
    const p = { ...emptyStore().presets[0]!, song: key }
    expect(presetFrom(p.id, presetDoc(p))?.song).toEqual(key)
  })

  it('samples never sync', () => {
    expect(
      diff(base(), base({ games: [game({ sample: true, completedAt: at(4) })] }), 'k'),
    ).toEqual([])
  })
})

describe('documents → Store', () => {
  it('round-trips a game, sorting rounds by time then id', () => {
    const g = game({
      startedBy: 'kate',
      rounds: [
        { id: 'r10', scores: { kate: 1, blair: 2 }, at: at(5), by: 'kate' },
        { id: 'r2', scores: { kate: 1, blair: 2 }, at: at(5), by: 'blair' },
        { id: 'r1', scores: { kate: 1, blair: 2 }, at: at(1), by: 'kate' },
      ],
    })
    const back = gameFrom('g1', { ...gameDoc(g), updatedAt: at(9) })
    expect(back?.rounds.map((r) => r.id)).toEqual(['r1', 'r2', 'r10'])
    expect(deepEqual(back, { ...g, rounds: back?.rounds })).toBe(true)
  })

  it('round-trips a "Who won?" game and a one-round-per-player preset', () => {
    const g = game({
      goal: 'wins',
      target: 2,
      rounds: [{ id: 'r1', scores: { kate: 0, blair: 1 } }],
    })
    const back = gameFrom('g1', { ...gameDoc(g), updatedAt: at(9) })
    expect(back?.goal).toBe('wins')
    expect(deepEqual(back, { ...g, rounds: back?.rounds })).toBe(true)
    const scout = emptyStore().presets.find((p) => p.id === 'scout')!
    expect(presetFrom('scout', { ...presetDoc(scout), updatedAt: at(9) })).toEqual(scout)
    // An old doc without the key still reads, as a preset without the flag.
    const { roundsPerPlayer: _, ...old } = presetDoc(scout)
    expect(presetFrom('scout', old)?.roundsPerPlayer).toBeUndefined()
  })

  it('drops soft-deleted and unreadable games', () => {
    expect(gameFrom('g1', { ...gameDoc(game()), deletedAt: at(2) })).toBeNull()
    expect(gameFrom('g1', { name: 'nope' })).toBeNull()
  })

  it('the live game is the newest unfinished one; finished games newest first', () => {
    const a = game({ id: 'a', startedAt: at(1) })
    const b = game({ id: 'b', startedAt: at(2) })
    const c = game({ id: 'c', completedAt: at(3), winnerId: 'kate' })
    const d = game({ id: 'd', completedAt: at(5), winnerId: 'kate' })
    const { active, games } = splitGames([a, c, b, d])
    expect(active?.id).toBe('b')
    expect(games.map((g) => g.id)).toEqual(['d', 'c'])
  })

  it('naturalCompare orders numbers by value', () => {
    expect(['g-r10', 'g-r2', 'g-r1'].sort(naturalCompare)).toEqual(['g-r1', 'g-r2', 'g-r10'])
  })
})

describe('withRoundIds', () => {
  it('gives old rounds <gameId>-r<n>, keeps existing ids and is idempotent', () => {
    const s = base({
      active: game({ id: 'live', rounds: [{ scores: { kate: 1 } }, { id: 'x', scores: {} }] }),
      games: [game({ id: 'old', rounds: [{ scores: {} }, { scores: {} }] })],
    })
    const fixed = withRoundIds(s)
    expect(fixed.active?.rounds.map((r) => r.id)).toEqual(['live-r1', 'x'])
    expect(fixed.games[0]?.rounds.map((r) => r.id)).toEqual(['old-r1', 'old-r2'])
    expect(withRoundIds(fixed)).toEqual(fixed)
    const done = withRoundIds(base({ games: [game({ rounds: [{ id: 'a', scores: {} }] })] }))
    expect(withRoundIds(done).games[0]).toBe(done.games[0])
  })
})

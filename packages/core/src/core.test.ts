import { describe, expect, it } from 'vitest'
import { fitsRange, playerRangeOf, rangeForGame } from './lineup'
import { migrate } from './migrate'
import { DEFAULT_PRESETS } from './presets'
import { freshStore, makeSamples } from './samples'
import type { Game } from './schemas'
import {
  evaluate,
  goalLabel,
  leaderOf,
  nearTarget,
  ordinal,
  parseScore,
  ranked,
  targetFor,
  totalsOf,
  winRound,
} from './scoring'
import { computeStats, winSeries } from './stats'

const clock = { now: () => Date.parse('2026-10-15T12:00:00Z') }

const game = (over: Partial<Game> = {}): Game => ({
  id: 'g',
  name: 'Test',
  goal: 'score',
  target: 100,
  lowWins: false,
  playerIds: ['a', 'b'],
  rounds: [],
  startedAt: '2026-10-01T00:00:00Z',
  completedAt: null,
  winnerId: null,
  ...over,
})
const rounds = (...rs: [number | null, number | null][]) =>
  rs.map(([a, b]) => ({ scores: { a, b } }))

describe('parseScore', () => {
  it('treats blanks as null and parses signed ints', () => {
    expect(parseScore('')).toBeNull()
    expect(parseScore('-')).toBeNull()
    expect(parseScore(' 42 ')).toBe(42)
    expect(parseScore('-7')).toBe(-7)
    expect(parseScore('abc')).toBeNull()
  })
})

describe('scoring', () => {
  it('totals with blanks as zero', () => {
    expect(totalsOf(game({ rounds: rounds([10, null], [5, 20]) }))).toEqual({ a: 15, b: 20 })
  })

  it('has no leader before the first round or while tied', () => {
    expect(leaderOf(game())).toBeNull()
    expect(leaderOf(game({ rounds: rounds([10, 10]) }))).toBeNull()
    expect(leaderOf(game({ rounds: rounds([10, 11]) }))).toBe('b')
  })

  it('ends a score race when someone reaches the target', () => {
    expect(evaluate(game({ rounds: rounds([60, 40]) }))).toEqual({ done: false })
    expect(evaluate(game({ rounds: rounds([60, 40], [45, 10]) }))).toEqual({
      done: true,
      winner: 'a',
    })
  })

  it('calls a tiebreak when the end is tied', () => {
    expect(evaluate(game({ rounds: rounds([100, 100]) }))).toEqual({ done: false, tie: true })
  })

  it('ends a rounds game after the last round', () => {
    const g = game({ goal: 'rounds', target: 2 })
    expect(evaluate({ ...g, rounds: rounds([1, 2]) }).done).toBe(false)
    expect(evaluate({ ...g, rounds: rounds([1, 2], [3, 1]) })).toEqual({ done: true, winner: 'a' })
  })

  it('never ends an open game on its own', () => {
    expect(evaluate(game({ goal: 'open', target: null, rounds: rounds([999, 0]) })).done).toBe(
      false,
    )
  })

  it('crowns the lowest when low score wins and someone busts', () => {
    const g = game({ lowWins: true, rounds: rounds([40, 30], [70, 20]) })
    expect(leaderOf(g)).toBe('b')
    expect(ranked(g)).toEqual(['b', 'a'])
    expect(evaluate(g)).toEqual({ done: true, winner: 'b' })
  })

  it('flags match point within 15% of the target', () => {
    const g = game()
    expect(nearTarget(g, 84)).toBe(false)
    expect(nearTarget(g, 85)).toBe(true)
    expect(nearTarget(g, 100)).toBe(false)
  })

  it('"Who won?": one winner a round, first to the target wins, no ties', () => {
    const g = game({ goal: 'wins', target: 2 })
    const r1 = { scores: winRound(['a', 'b'], 'a') }
    expect(r1.scores).toEqual({ a: 1, b: 0 })
    expect(evaluate({ ...g, rounds: [r1] }).done).toBe(false)
    expect(evaluate({ ...g, rounds: [r1, { scores: winRound(['a', 'b'], 'b') }] }).done).toBe(false)
    expect(evaluate({ ...g, rounds: [r1, { scores: winRound(['a', 'b'], 'a') }] })).toEqual({
      done: true,
      winner: 'a',
    })
    // A single game: one tap ends it.
    expect(evaluate({ ...g, target: 1, rounds: [r1] })).toEqual({ done: true, winner: 'a' })
  })

  it('deals the right target from a preset', () => {
    expect(targetFor({ goal: 'rounds', target: 3, roundsPerPlayer: true }, 5)).toBe(5)
    expect(targetFor({ goal: 'rounds', target: 3 }, 5)).toBe(3)
    expect(targetFor({ goal: 'wins', target: null }, 2)).toBe(1)
    expect(targetFor({ goal: 'open', target: 200 }, 2)).toBeNull()
    expect(targetFor({ goal: 'score', target: 21 }, 2)).toBe(21)
  })

  it('labels goals', () => {
    expect(goalLabel(game())).toBe('Race to 100')
    expect(goalLabel(game({ lowWins: true }))).toBe('Bust at 100')
    expect(goalLabel(game({ goal: 'rounds', target: 9, lowWins: true }))).toBe(
      '9 rounds · low wins',
    )
    expect(goalLabel(game({ goal: 'open', target: null }))).toBe('Open-ended')
    expect(goalLabel(game({ goal: 'wins', target: 1 }))).toBe('Who won?')
    expect(goalLabel(game({ goal: 'wins', target: 2 }))).toBe('First to 2 wins')
    expect(goalLabel(game({ goal: 'rounds', target: 1 }))).toBe('Final scores')
  })

  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '101st',
    ])
  })
})

describe('samples', () => {
  it('are deterministic, finished and newest first', () => {
    const a = makeSamples(clock)
    expect(a).toEqual(makeSamples(clock))
    expect(a).toHaveLength(10)
    for (const g of a) {
      expect(g.winnerId).not.toBeNull()
      expect(g.completedAt).not.toBeNull()
    }
    expect(a[0]!.completedAt! > a[9]!.completedAt!).toBe(true)
  })

  it('seat only as many as a game allows (The Fox in the Forest: a rotating pair)', () => {
    const fox = makeSamples(clock).filter((g) => g.name === 'The Fox in the Forest')
    expect(fox.length).toBeGreaterThan(0)
    for (const g of fox) expect(g.playerIds).toHaveLength(2)
    expect(new Set(fox.flatMap((g) => g.playerIds)).size).toBe(3) // everyone gets a turn
    for (const g of makeSamples(clock))
      expect(fitsRange(rangeForGame(DEFAULT_PRESETS, g.name), g.playerIds.length)).toBe(true)
  })
})

describe('player counts', () => {
  const fox = { id: 'the-fox-in-the-forest' }
  it('come from the preset, field by field falling back to the built-in default, then 2+', () => {
    expect(playerRangeOf({ ...fox, minPlayers: 2, maxPlayers: 2 })).toEqual({ min: 2, max: 2 })
    // A family record seeded before the fields existed still knows the Fox is for two.
    expect(playerRangeOf(fox)).toEqual({ min: 2, max: 2 })
    expect(playerRangeOf({ id: 'high-society' })).toEqual({ min: 3, max: null })
    // The family's choice wins, including "no limit".
    expect(playerRangeOf({ ...fox, maxPlayers: null })).toEqual({ min: 2, max: null })
    expect(playerRangeOf({ id: 'yahtzee', minPlayers: 4 })).toEqual({ min: 4, max: null })
    expect(playerRangeOf({ id: 'yahtzee' })).toEqual({ min: 2, max: null })
    expect(playerRangeOf(null)).toEqual({ min: 2, max: null })
    // A max below the min never makes a game unplayable.
    expect(playerRangeOf({ id: 'x', minPlayers: 4, maxPlayers: 3 })).toEqual({ min: 4, max: 4 })
  })

  it('look a game up by name: the family preset, else a built-in, else 2+', () => {
    const presets = [{ ...DEFAULT_PRESETS[0]!, id: 'own', name: 'Hearts', minPlayers: 3 }]
    expect(rangeForGame(presets, ' hearts ')).toEqual({ min: 3, max: null })
    expect(rangeForGame([], 'The Fox in the Forest')).toEqual({ min: 2, max: 2 })
    expect(rangeForGame([], 'Flip 7')).toEqual({ min: 2, max: null })
    expect(fitsRange({ min: 2, max: 2 }, 3)).toBe(false)
    expect(fitsRange({ min: 3, max: null }, 2)).toBe(false)
    expect(fitsRange({ min: 3, max: null }, 12)).toBe(true)
  })
})

describe('stats', () => {
  it('counts wins, streaks and favourites', () => {
    const s = computeStats(freshStore(clock).games)
    expect(s.total).toBe(10)
    expect(s.standings.reduce((n, x) => n + x.wins, 0)).toBe(10)
    expect(s.fav).toEqual({ name: 'The Fox in the Forest', count: 4 })
    expect(s.best.n).toBeGreaterThanOrEqual(s.current.n)
    expect(s.big?.v).toBeGreaterThan(0)
  })

  it('builds cumulative win series', () => {
    const series = winSeries(makeSamples(clock))
    expect(series.every((x) => x.pts.length === 11 && x.pts[0] === 0)).toBe(true)
    expect(series.reduce((n, x) => n + x.pts[10]!, 0)).toBe(10)
  })
})

describe('migrate', () => {
  it('passes a valid v3 store through', () => {
    const s = freshStore(clock)
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  it('upgrades the prototype v2 shape to ids', () => {
    const v2 = {
      games: [
        {
          id: 'g1',
          name: 'Flip 7',
          goal: 'score',
          target: 200,
          players: ['Kate', 'Mary Jo'],
          rounds: [
            { scores: { Kate: 120, 'Mary Jo': 90 } },
            { scores: { Kate: 90, 'Mary Jo': null } },
          ],
          startedAt: '2026-10-01T00:00:00Z',
          completedAt: '2026-10-01T01:00:00Z',
          winner: 'Kate',
        },
      ],
      active: null,
      colors: { Kate: 0, 'Mary Jo': 5 },
      lastPlayers: ['Kate', 'Mary Jo'],
      muted: true,
      hasSamples: false,
    }
    const s = migrate(v2)!
    expect(s.players).toEqual([
      { id: 'kate', name: 'Kate', color: 0 },
      { id: 'mary-jo', name: 'Mary Jo', color: 5 },
    ])
    expect(s.games[0]!.winnerId).toBe('kate')
    expect(s.games[0]!.rounds[1]!.scores).toEqual({ kate: 90, 'mary-jo': null })
    expect(s.prefs.muted).toBe(true)
    expect(s.presets.map((p) => p.name)).toContain('Mille Bornes')
  })

  it('drops prefs it no longer knows (the short-lived soundInSilent)', () => {
    const saved = JSON.parse(JSON.stringify(freshStore(clock)))
    saved.prefs.soundInSilent = true
    expect(migrate(saved)?.prefs).not.toHaveProperty('soundInSilent')
  })

  it('gives prefs saved before the install guide existed installHintSeen: false', () => {
    const saved = JSON.parse(JSON.stringify(freshStore(clock)))
    delete saved.prefs.installHintSeen
    const s = migrate(saved)!
    expect(s.prefs.installHintSeen).toBe(false)
    expect(s.prefs.theme).toBe(saved.prefs.theme)
    // Once seen, it stays seen.
    saved.prefs.installHintSeen = true
    expect(migrate(saved)?.prefs.installHintSeen).toBe(true)
  })

  it('migrates the prototype (v2) with the install guide not yet seen', () => {
    expect(migrate({ games: [] })?.prefs.installHintSeen).toBe(false)
  })

  it('rejects garbage', () => {
    expect(migrate({ nope: 1 })).toBeNull()
    expect(migrate(null)).toBeNull()
  })
})

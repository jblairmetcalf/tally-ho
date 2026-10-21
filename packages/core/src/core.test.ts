import { describe, expect, it } from 'vitest'
import { fitsRange, playerRangeOf, rangeForGame } from './lineup'
import { migrate } from './migrate'
import {
  beatLength,
  type CodaFacts,
  chordOf,
  codaOf,
  keyOf,
  LOOPS,
  loopName,
  outcomesOf,
  riffOf,
  roundNotes,
  SONG_RULES,
  scaleOf,
  scheduleOf,
  songOf,
  voiceOf,
} from './mixtape'
import { DEFAULT_PRESETS } from './presets'
import { freshStore, makeSamples, rng } from './samples'
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
import { computeStickers, STICKER_RULES, STICKERS, stickersOf, totalsAt } from './stickers'

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

describe('standings movement', () => {
  const won = (n: number, winnerId: string, playerIds = ['kate', 'blair', 'alder']): Game => ({
    id: `m${n}`,
    name: 'Uno',
    goal: 'wins',
    target: 1,
    lowWins: false,
    playerIds,
    rounds: [],
    startedAt: `2026-10-0${n}T19:00:00.000Z`,
    completedAt: `2026-10-0${n}T20:00:00.000Z`,
    winnerId,
  })
  const moves = (games: Game[]) =>
    Object.fromEntries(computeStats(games).standings.map((x) => [x.id, x.move]))

  it('marks only a real change in the standings: passing someone, not drawing level', () => {
    // Blair was behind Kate and draws level: a tie isn't a change, so no marks at all (even
    // though the table lists Blair first by name).
    expect(moves([won(1, 'kate'), won(2, 'kate'), won(3, 'blair'), won(4, 'blair')])).toEqual({
      kate: 0,
      blair: 0,
      alder: 0,
    })
    // Level before, ahead now: Blair climbs past Kate, Kate slips. Alder was already behind.
    expect(moves([won(1, 'kate'), won(2, 'blair'), won(3, 'blair')])).toEqual({
      blair: 1,
      kate: -1,
      alder: 0,
    })
    // Blair's first win: still behind Kate (no change there), but past Alder, level on zero.
    expect(moves([won(1, 'kate'), won(2, 'kate'), won(3, 'blair')])).toEqual({
      kate: 0,
      blair: 1,
      alder: -1,
    })
    // All level, then Blair wins: she passes both.
    expect(moves([won(1, 'kate'), won(2, 'alder'), won(3, 'blair'), won(4, 'blair')])).toEqual({
      blair: 2,
      kate: -1,
      alder: -1,
    })
  })

  it('shows nothing after the first game, or for someone new in the last one', () => {
    expect(moves([won(1, 'kate')])).toEqual({ kate: 0, blair: 0, alder: 0 })
    const rowan = moves([won(1, 'kate'), won(2, 'rowan', ['kate', 'rowan'])])
    expect(rowan.rowan).toBe(0)
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

describe('stickers', () => {
  let n = 0
  /** A finished game: scores per round as [kate, blair] (or more), finished at a local hour. */
  const game = (
    over: Partial<Game> & { scores?: number[][]; hour?: number; day?: number },
  ): Game => {
    n++
    const playerIds = over.playerIds ?? ['kate', 'blair']
    const rounds = (over.scores ?? [[1, 0]]).map((row, i) => ({
      id: `r${n}-${i}`,
      scores: Object.fromEntries(playerIds.map((p, j) => [p, row[j] ?? 0])),
    }))
    const at = new Date(2026, 8, over.day ?? n, over.hour ?? 19, 0).toISOString()
    return {
      id: `st${n}`,
      name: 'Flip 7',
      goal: 'score',
      target: 200,
      lowWins: false,
      startedAt: at,
      completedAt: at,
      winnerId: 'kate',
      ...over,
      playerIds,
      rounds,
    } as Game
  }
  const got = (games: Game[], gameIndex = games.length - 1) =>
    (computeStickers(games).byGame[games[gameIndex]!.id] ?? []).map((e) => `${e.playerId}:${e.id}`)

  it('First Crown, Hat Trick every third win in a row, Double Digits on the 10th', () => {
    const wins = Array.from({ length: 10 }, () => game({ scores: [[200, 10]] }))
    const book = computeStickers(wins)
    expect(book.counts.kate).toMatchObject({ crown: 1, hat: 3, ten: 1 })
    expect(got(wins, 0)).toContain('kate:crown')
    expect(got(wins, 2)).toContain('kate:hat')
    expect(got(wins, 9)).toContain('kate:ten')
    expect(stickersOf(book, 'kate')).toBeGreaterThanOrEqual(3)
  })

  it('Comeback Kid scales to the game: a quarter of the target, whatever the target', () => {
    // Fox race to 21: Kate trailed 0–6 (over 21/4) and won.
    expect(
      got([
        game({
          target: 21,
          scores: [
            [0, 6],
            [21, 0],
          ],
        }),
      ]),
    ).toContain('kate:comeback')
    // Down only 0–4: not a comeback.
    expect(
      got([
        game({
          target: 21,
          scores: [
            [0, 4],
            [21, 0],
          ],
        }),
      ]),
    ).not.toContain('kate:comeback')
    // Mille Bornes to 1000: trailing by 300 is (a quarter is 250).
    expect(
      got([
        game({
          target: 1000,
          scores: [
            [0, 300],
            [1000, 0],
          ],
        }),
      ]),
    ).toContain('kate:comeback')
    // First to two: lost the first round, won the match.
    expect(
      got([
        game({
          goal: 'wins',
          target: 2,
          scores: [
            [0, 1],
            [1, 0],
            [1, 0],
          ],
        }),
      ]),
    ).toContain('kate:comeback')
  })

  it('Wire to Wire, Photo Finish and Steamroller, in points and first-to-N', () => {
    expect(
      got([
        game({
          scores: [
            [10, 5],
            [10, 5],
            [180, 5],
          ],
        }),
      ]),
    ).toContain('kate:wire')
    expect(got([game({ scores: [[200, 195]] })])).toContain('kate:photo') // by 5 of 200
    expect(
      got([
        game({
          scores: [
            [150, 0],
            [60, 40],
          ],
        }),
      ]),
    ).toContain('kate:steam') // 210 vs 40
    expect(
      got([
        game({
          goal: 'wins',
          target: 2,
          scores: [
            [1, 0],
            [1, 0],
          ],
        }),
      ]),
    ).toContain('kate:steam')
    expect(
      got([
        game({
          goal: 'wins',
          target: 2,
          scores: [
            [1, 0],
            [0, 1],
            [1, 0],
          ],
        }),
      ]),
    ).toContain('kate:photo') // the decider at one apiece
    // A single "Who won?" game earns none of the points stickers.
    const single = got([game({ goal: 'wins', target: 1, scores: [[1, 0]] })])
    expect(single.filter((s) => /comeback|wire|photo|steam|bust/.test(s))).toEqual([])
  })

  it('lowest-wins games turn the comparisons round', () => {
    // Hearts to 100: Kate 20 vs Blair 100 is a steamroller the low way round.
    expect(
      got([
        game({
          target: 100,
          lowWins: true,
          scores: [
            [10, 60],
            [10, 40],
          ],
        }),
      ]),
    ).toContain('kate:steam')
    // No Big Fat Zero when zero is good.
    expect(
      got([
        game({
          lowWins: true,
          scores: [
            [0, 5],
            [1, 5],
          ],
        }),
      ]),
    ).not.toContain('kate:bust')
  })

  it('Big Fat Zero, Marathon and Night Owl go to everyone who earned them', () => {
    expect(
      got([
        game({
          scores: [
            [0, 5],
            [200, 5],
          ],
        }),
      ]),
    ).toContain('kate:bust')
    const long = got([game({ goal: 'rounds', target: 10, scores: Array(10).fill([5, 1]) })])
    expect(long).toEqual(expect.arrayContaining(['kate:marathon', 'blair:marathon']))
    expect(got([game({ hour: 23 })])).toEqual(expect.arrayContaining(['kate:owl', 'blair:owl']))
    expect(got([game({ hour: 21 })])).not.toContain('kate:owl')
  })

  it('Polymath for wins in three different games; Underdog for winning from last place', () => {
    const three = ['Uno', 'Jaipur', 'Spicy'].map((name) => game({ name, goal: 'wins', target: 1 }))
    expect(got(three)).toContain('kate:polymath')
    const under = [
      game({ winnerId: 'blair', scores: [[0, 200]] }),
      game({ winnerId: 'blair', scores: [[0, 200]] }),
      game({ scores: [[200, 0]] }),
    ]
    expect(got(under)).toContain('kate:underdog')
  })

  it("counts repeats, marks firsts as new, and drops a deleted game's stickers", () => {
    const a = game({ hour: 23 })
    const b = game({ hour: 23 })
    const book = computeStickers([a, b])
    expect(book.counts.kate?.owl).toBe(2)
    expect(book.byGame[a.id]?.find((e) => e.id === 'owl' && e.playerId === 'kate')?.isNew).toBe(
      true,
    )
    expect(book.byGame[b.id]?.find((e) => e.id === 'owl' && e.playerId === 'kate')?.isNew).toBe(
      false,
    )
    expect(book.recent[0]?.gameId).toBe(b.id) // newest first
    expect(computeStickers([b]).counts.kate?.owl).toBe(1)
  })

  it('totalsAt adds up the first k rounds; the thresholds are the documented ones', () => {
    const g = game({
      scores: [
        [3, 1],
        [4, 0],
        [5, 9],
      ],
    })
    expect(totalsAt(g, 0)).toEqual({ kate: 0, blair: 0 })
    expect(totalsAt(g, 2)).toEqual({ kate: 7, blair: 1 })
    expect(STICKER_RULES).toMatchObject({ comeback: 0.25, photo: 0.05, steam: 1.5, marathon: 10 })
  })

  it('the sample history earns the same stickers every time', () => {
    const a = computeStickers(makeSamples(clock))
    expect(a).toEqual(computeStickers(makeSamples(clock)))
    expect(a.recent.length).toBeGreaterThan(0)
    expect(STICKERS).toHaveLength(12)
  })
})

describe('mixtape', () => {
  // Colours 0 (root), 1 (third), 2 (fifth), 3 (root again).
  const colors: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 }
  const colorOf = (id: string) => colors[id] ?? 0
  const pc = (m: number) => ((m % 12) + 12) % 12

  it('gives every player a fixed part of the chord, from their colour', () => {
    expect([0, 1, 2, 3, 7].map(voiceOf)).toEqual(['root', 'third', 'fifth', 'root', 'third'])
  })

  it('keys a game by its name: same name, same key, loop and riff; low wins is minor', () => {
    const a = keyOf({ name: 'Flip 7', lowWins: false })
    expect(keyOf({ name: ' flip 7 ', lowWins: false })).toEqual(a)
    expect(a.mode).toBe('major')
    expect(keyOf({ name: 'Hearts', lowWins: true }).mode).toBe('minor')
    expect(riffOf({ name: 'Flip 7', lowWins: false })).toEqual(
      riffOf({ name: 'Flip 7', lowWins: false }),
    )
    const own = { tonic: 2, mode: 'minor' as const, loop: 3 }
    expect(keyOf({ name: 'Flip 7', lowWins: false, song: own })).toEqual(own)
    expect(loopName('major', 0)).toBe('I–V–vi–IV')
    expect(loopName('minor', 0)).toBe('i–VI–III–VII')
  })

  it('riffs are 6 to 8 notes, all in the key', () => {
    for (const name of ['Flip 7', 'Sushi Go', 'Uno', 'Hearts', 'Push', 'Jaipur 2']) {
      const g = game({ name })
      const s = songOf(g, colorOf)
      expect(s.riff.length).toBeGreaterThanOrEqual(6)
      expect(s.riff.length).toBeLessThanOrEqual(8)
      const scale = scaleOf(s.key)
      for (const n of scheduleOf(s).notes) expect(scale).toContain(pc(n.midi))
    }
  })

  it('a round sings its best scorer; ties sing a chord; nobody scoring is a rest', () => {
    const g = game({ rounds: rounds([10, 4], [6, 6], [0, 0], [null, null]) })
    const s = songOf(g, colorOf)
    expect(s.beats.map((b) => b.tones.map((t) => t.playerId))).toEqual([['a'], ['a', 'b'], [], []])
    expect(s.beats[1]?.tones.map((t) => t.voice)).toEqual(['root', 'third'])
    // A rest still has its bass.
    const sched = scheduleOf(s)
    const rest = sched.notes.filter((n) => n.beat === 2)
    expect(rest.map((n) => n.part)).toEqual(['bass'])
  })

  it('low wins: the lowest score sings', () => {
    const g = game({ lowWins: true, rounds: rounds([3, 9]) })
    expect(songOf(g, colorOf).beats[0]?.tones[0]?.playerId).toBe('a')
  })

  it('scales the band to the game: a share of the target in a race', () => {
    const band = (target: number, a: number) =>
      songOf(game({ target, rounds: rounds([a, 0]) }), colorOf).beats[0]?.tones[0]
    // Flip 7 to 200: 10 is low, 30 middle, 45 high, 70 high with the ninth.
    expect(band(200, 10)?.band).toBe(0)
    expect(band(200, 30)?.band).toBe(1)
    expect(band(200, 45)?.band).toBe(2)
    expect(band(200, 70)).toMatchObject({ band: 2, ninth: true })
    // Mille Bornes to 5000: a 700-point hand is middle, not off the top.
    expect(band(5000, 700)?.band).toBe(1)
    expect(SONG_RULES.race).toHaveLength(3)
  })

  it('rounds games compare with the best earlier round; a record adds the ninth', () => {
    const g = game({ goal: 'rounds', target: 5, rounds: rounds([20, 0], [5, 0], [25, 0], [18, 0]) })
    const t = songOf(g, colorOf).beats.map((b) => b.tones[0])
    expect(t[0]).toMatchObject({ band: 1 })
    expect(t[1]?.band).toBe(0)
    expect(t[2]).toMatchObject({ band: 2, ninth: true })
    expect(t[3]?.band).toBe(2)
  })

  it('Who won? games sing the middle band, the deciding win high', () => {
    const g = game({
      goal: 'wins',
      target: 2,
      rounds: [{ scores: winRound(['a', 'b'], 'a') }, { scores: winRound(['a', 'b'], 'a') }],
    })
    expect(songOf(g, colorOf).beats.map((b) => b.tones[0]?.band)).toEqual([1, 2])
  })

  it('licks mark their moments, one per beat at most', () => {
    // b takes the lead in round 2 (turnaround); a busts in round 2 too, but the lead wins.
    const lead = songOf(game({ rounds: rounds([5, 2], [0, 20]) }), colorOf)
    expect(lead.beats[0]?.lick).toBeUndefined()
    expect(lead.beats[1]?.lick).toMatchObject({ kind: 'turnaround', playerId: 'b' })
    // Three round wins in a row: the hammer.
    const ham = songOf(game({ rounds: rounds([5, 1], [5, 1], [5, 1]) }), colorOf)
    expect(ham.beats[2]?.lick?.kind).toBe('hammer')
    // A zero while the other scores (and nothing more telling): the slide.
    const slide = songOf(game({ rounds: rounds([5, 1], [5, 0]) }), colorOf)
    expect(slide.beats[1]?.lick).toMatchObject({ kind: 'slide', playerId: 'b' })
    // Reaching match point: the suspension, once per player.
    const mp = songOf(game({ rounds: rounds([50, 1], [36, 1], [5, 1]) }), colorOf)
    expect(mp.beats[1]?.lick).toMatchObject({ kind: 'suspension', playerId: 'a' })
    expect(mp.beats[2]?.lick?.kind).not.toBe('suspension')
  })

  it('a finished game ends on a coda; a live one has none', () => {
    const done = game({
      completedAt: '2026-10-02T00:00:00Z',
      winnerId: 'b',
      rounds: rounds([1, 9]),
    })
    const s = songOf(done, colorOf)
    // No history given: a routine, decisive ending on the winner's part.
    expect(s.coda).toMatchObject({ story: 'routine', streak: 1, seal: 'decisive', voice: 'third' })
    expect(songOf(game({ rounds: rounds([1, 9]) }), colorOf).coda).toBeUndefined()
    const parts = new Set(scheduleOf(s).notes.map((n) => n.part))
    expect(parts.has('story') && parts.has('chord')).toBe(true)
  })

  it("the coda's story: each occasion has its own motif; routine is the winner's signature", () => {
    const key = { tonic: 0, mode: 'major' as const, loop: 0 }
    const base: CodaFacts = {
      story: 'routine',
      streak: 1,
      seal: 'decisive',
      strength: 0,
      voice: 'root',
      color: 0,
      answer: null,
    }
    const contour = (f: Partial<CodaFacts>) =>
      codaOf(key, { ...base, ...f })
        .story.filter((n) => n.part === 'story')
        .slice(1)
        .map((n) => n.midi)
    const all = (['comeback', 'first', 'upset', 'new', 'defend', 'routine'] as const).map((story) =>
      contour({ story }).join(','),
    )
    expect(new Set(all).size).toBe(6)
    // A comeback dips under the tonic before it leaps.
    const cb = contour({ story: 'comeback' })
    expect(Math.min(...cb)).toBeLessThan(cb[cb.length - 1]! - 12)
    // Routine: three notes, walking up into them for a stronger win (Score Climb).
    expect(contour({ strength: 0 })).toHaveLength(3)
    expect(contour({ strength: 0.5 })).toHaveLength(4)
    expect(contour({ strength: 0.9 })).toHaveLength(5)
    // The signature lands on the winner's own part, so every win of theirs ends alike.
    expect(contour({ voice: 'third' }).at(-1)! % 12).toBe(4) // E over C
  })

  it("the coda's chord stacks the streak; the seal tells how close it was", () => {
    const key = { tonic: 0, mode: 'major' as const, loop: 0 }
    const f: CodaFacts = {
      story: 'routine',
      streak: 1,
      seal: 'decisive',
      strength: 0.5,
      voice: 'root',
      color: 0,
      answer: 'third',
    }
    const tones = (streak: number) =>
      codaOf(key, { ...f, streak }).chord.filter((n) => n.part === 'chord').length
    // The streak's stack, plus the winner's signature colour on top.
    expect([1, 2, 3, 4, 5, 9].map(tones)).toEqual([2, 3, 4, 5, 6, 6])
    const top = (color: number) =>
      codaOf(key, { ...f, color })
        .chord.filter((n) => n.part === 'chord')
        .at(-1)!.midi % 12
    expect([0, 1, 2, 3].map(top)).toEqual([2, 9, 11, 5]) // add9 D, 6th A, 7th B, 4th F over C
    // Decisive: a clean fifth rings over the chord.
    expect(codaOf(key, f).seal.map((n) => n.midi % 12)).toEqual([7])
    // Photo finish: the runner-up answers, and a 4th resolves to the 3rd (F → E in C).
    const photo = codaOf(key, { ...f, seal: 'photo' }).seal
    expect(photo.filter((n) => n.part === 'answer')).toHaveLength(2)
    const sus = photo.filter((n) => n.part === 'seal').map((n) => n.midi % 12)
    expect(sus).toEqual([5, 4])
    // Steamroller: `deal`'s sparkle, the tonic and third high over the top.
    const steam = codaOf(key, { ...f, seal: 'steam' }).seal.map((n) => n.midi % 12)
    expect(steam).toEqual([0, 4])
  })

  it('the longest song (20 rounds, the longest story, a full stack, a photo finish) is 5 s or less', () => {
    const long = game({
      completedAt: '2026-10-02T00:00:00Z',
      winnerId: 'a',
      rounds: Array.from({ length: 20 }, (_, i) => ({ scores: { a: i % 3, b: i % 2 } })),
    })
    for (const story of ['comeback', 'upset', 'new'] as const) {
      const out = { story, streak: 9, seal: 'photo' as const, strength: 1, runnerUp: 'b' }
      expect(scheduleOf(songOf(long, colorOf, out)).length).toBeLessThanOrEqual(5.0)
    }
  })

  it('outcomes read the history before each game, the way stickers do', () => {
    const at = (d: number) => `2026-10-${String(d).padStart(2, '0')}T20:00:00Z`
    const won = (id: string, d: number, w: string, rs = rounds([10, 4])): Game =>
      game({ id, completedAt: at(d), winnerId: w, rounds: rs })
    const history = [
      won('g1', 1, 'a'), // a's first win
      won('g2', 2, 'b'), // b's first win
      won('g3', 3, 'a'), // a leads again: new champion
      won('g4', 4, 'a'), // a defends, two in a row… three
      won('g5', 5, 'b'), // b was last: an upset
      won('g6', 6, 'b', rounds([30, 0], [0, 40])), // came from 30 behind: a comeback
    ]
    const o = outcomesOf(history)
    expect(['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map((id) => o.get(id)?.story)).toEqual([
      'first',
      'first',
      'new',
      'defend',
      'upset',
      'comeback',
    ])
    expect(o.get('g4')?.streak).toBe(2)
    expect(o.get('g6')?.streak).toBe(2)
    expect(o.get('g1')?.runnerUp).toBe('b')
    // Order of the list doesn't matter, only completion order; live games have none.
    expect(outcomesOf([...history].reverse())).toEqual(o)
    expect(outcomesOf([game()]).size).toBe(0)
    // A song with its outcome uses it.
    expect(songOf(history[4]!, colorOf, o.get('g5')).coda?.story).toBe('upset')
  })

  it('is deterministic, and a new round never changes the earlier ones', () => {
    const g = game({ rounds: rounds([5, 3], [2, 8], [0, 0], [7, 7]) })
    expect(songOf(g, colorOf)).toEqual(songOf(structuredClone(g), colorOf))
    const more = { ...g, rounds: [...g.rounds, ...rounds([9, 1])] }
    expect(songOf(more, colorOf).beats.slice(0, 4)).toEqual(songOf(g, colorOf).beats)
  })

  it('every note is in the key and every beat tone is in its chord (any game)', () => {
    const r = rng(7)
    const goals = ['score', 'rounds', 'wins', 'open'] as const
    for (let k = 0; k < 120; k++) {
      const ids = ['a', 'b', 'c', 'd'].slice(0, 2 + Math.floor(r() * 3))
      const goal = goals[k % 4] ?? 'score'
      const n = 1 + Math.floor(r() * 20)
      const rs = Array.from({ length: n }, () =>
        goal === 'wins'
          ? { scores: winRound(ids, ids[Math.floor(r() * ids.length)] ?? 'a') }
          : {
              scores: Object.fromEntries(
                ids.map((p) => [p, Math.floor(r() * 4) * Math.floor(r() * 30)]),
              ),
            },
      )
      const g = game({
        name: `Game ${k}`,
        goal,
        target: goal === 'open' ? null : goal === 'rounds' ? n : 150,
        lowWins: goal !== 'wins' && k % 5 === 0,
        playerIds: ids,
        rounds: rs,
        completedAt: k % 2 ? '2026-10-02T00:00:00Z' : null,
        winnerId: k % 2 ? (ids[0] ?? null) : null,
      })
      const stories = ['comeback', 'first', 'upset', 'new', 'defend', 'routine'] as const
      const seals = ['photo', 'decisive', 'steam'] as const
      const outcome = {
        story: stories[k % 6] ?? 'routine',
        streak: 1 + (k % 6),
        seal: seals[k % 3] ?? 'decisive',
        strength: r(),
        runnerUp: ids[1] ?? null,
      }
      const s = songOf(g, colorOf, outcome)
      expect(s.beats).toHaveLength(n)
      const sched = scheduleOf(s)
      const scale = scaleOf(s.key)
      for (const note of sched.notes) expect(scale).toContain(pc(note.midi))
      for (const note of sched.notes.filter((x) => x.part === 'lead' || x.part === 'bass')) {
        const b = s.beats[note.beat]
        if (b) expect(chordOf(s.key, b.chord)).toContain(pc(note.midi))
      }
      for (const b of s.beats) expect(LOOPS[s.key.mode][s.key.loop]).toContain(b.chord)
      // Short: never much over five seconds, however long the game.
      expect(sched.length).toBeLessThanOrEqual(5.0)
    }
  })

  it('lays out one beat per round, tighter for long games', () => {
    expect(beatLength(4)).toBe(SONG_RULES.beat)
    expect(beatLength(20)).toBeCloseTo(SONG_RULES.minBeat)
    const s = scheduleOf(songOf(game({ rounds: rounds([1, 0], [0, 1], [2, 0]) }), colorOf))
    expect(s.beatTimes).toHaveLength(3)
    expect(s.beatTimes[1]! - s.beatTimes[0]!).toBeCloseTo(SONG_RULES.beat)
    expect(roundNotes(songOf(game({ rounds: rounds([1, 0]) }), colorOf), 0)[0]?.t).toBe(0)
    expect(roundNotes(songOf(game(), colorOf), 3)).toEqual([])
  })

  it('songs are never stored: a store saved with an old shelf still loads, without it', () => {
    const s = { ...freshStore(clock), songs: [{ gameId: 'x', favorite: true }] }
    const loaded = migrate(s)
    expect(loaded?.games).toHaveLength(10)
    expect(loaded).not.toHaveProperty('songs')
  })
})

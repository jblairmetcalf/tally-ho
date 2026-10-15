import {
  type Clock,
  emptyStore,
  freshStore,
  type Game,
  makeSamples,
  type Round,
  type Store,
  type ThemePref,
} from '@tally/core'

/** Seeded households for stories and tests. Time is fixed so every render is identical. */
export const FIXED_NOW = Date.UTC(2026, 9, 12, 19, 30)
export const fixedClock: Clock = { now: () => FIXED_NOW }

const P = ['kate', 'blair', 'alder']
const rounds = (...rows: number[][]): Round[] =>
  rows.map((r) => ({ scores: Object.fromEntries(P.map((p, i) => [p, r[i] ?? null])) }))

function liveGame(patch: Partial<Game> & Pick<Game, 'name' | 'goal' | 'target'>): Game {
  return {
    id: 'live',
    lowWins: false,
    playerIds: P.slice(),
    rounds: [],
    startedAt: new Date(FIXED_NOW - 30 * 60e3).toISOString(),
    completedAt: null,
    winnerId: null,
    ...patch,
  }
}

/** A household that has played for a while: the sample history, no longer marked as samples. */
function played(): Store {
  return {
    ...emptyStore(),
    games: makeSamples(fixedClock).map(({ sample: _sample, ...g }) => g),
    hasSamples: false,
  }
}

const withActive = (active: Game): Store => ({ ...played(), active })

export const SCENARIOS = {
  firstRun: () => freshStore(fixedClock),
  empty: () => emptyStore(),
  /** Blair's two most recent wins removed: Blair and Kate level on 3 — the champion card ties. */
  deadHeat: () => {
    const s = played()
    let drop = 2
    const games = s.games.filter((g) => !(g.winnerId === 'blair' && drop-- > 0))
    return { ...s, games }
  },
  flip7Race: () =>
    withActive(
      liveGame({
        name: 'Flip 7',
        goal: 'score',
        target: 200,
        rounds: rounds([34, 12, 27], [0, 41, 18], [22, 30, 0], [45, 8, 33]),
      }),
    ),
  matchPoint: () =>
    withActive(
      liveGame({
        name: 'Flip 7',
        goal: 'score',
        target: 200,
        rounds: rounds([48, 22, 30], [51, 40, 12], [0, 35, 41], [44, 18, 27], [38, 9, 0]),
      }),
    ),
  sushiFinal: () =>
    withActive(
      liveGame({
        name: 'Sushi Go',
        goal: 'rounds',
        target: 3,
        rounds: rounds([31, 24, 28], [22, 35, 19]),
      }),
    ),
  tiebreak: () =>
    withActive(
      liveGame({
        name: 'Sushi Go',
        goal: 'rounds',
        target: 3,
        rounds: rounds([30, 26, 21], [24, 31, 20], [28, 25, 22]),
      }),
    ),
  hearts: () =>
    withActive(
      liveGame({
        name: 'Hearts',
        goal: 'score',
        target: 100,
        lowWins: true,
        rounds: rounds([26, 0, 0], [13, 4, 9], [21, 8, 0], [26, 0, 0], [3, 10, 14]),
      }),
    ),
} satisfies Record<string, () => Store>
export type Scenario = keyof typeof SCENARIOS

/** A just-finished Flip 7 game and the store it lives in, for the victory overlay. */
export function finishedScenario(): { store: Store; game: Game } {
  const game = liveGame({
    id: 'won',
    name: 'Flip 7',
    goal: 'score',
    target: 200,
    rounds: rounds([48, 22, 30], [51, 40, 12], [0, 35, 41], [44, 18, 27], [62, 9, 0]),
    completedAt: new Date(FIXED_NOW).toISOString(),
    winnerId: 'kate',
  })
  const s = played()
  return { store: { ...s, games: [game, ...s.games] }, game }
}

export function withTheme(s: Store, theme: ThemePref): Store {
  return { ...s, prefs: { ...s.prefs, theme } }
}

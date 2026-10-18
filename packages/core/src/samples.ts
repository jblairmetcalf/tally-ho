import { emptyStore } from './presets'
import type { Clock, Game, Store } from './schemas'
import { evaluate, ranked, winRound } from './scoring'

/** Park–Miller, as in the prototype, so the sample history matches it exactly. */
export function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const DAY = 864e5
const PLAN: [string, Game['goal'], number][] = [
  ['The Fox in the Forest', 'score', 21],
  ['Scout', 'rounds', 3],
  ['Mille Bornes', 'score', 1000],
  ['The Fox in the Forest', 'score', 21],
  ['Scout', 'rounds', 3],
  ['Uno', 'wins', 1],
  ['The Fox in the Forest', 'score', 21],
  ['Mille Bornes', 'score', 1000],
  ['Scout', 'rounds', 3],
  ['The Fox in the Forest', 'score', 21],
]

/** One round's score for a player of the given skill, shaped like the real game. */
function roundScore(name: string, r: () => number, k: number): number {
  switch (name) {
    case 'The Fox in the Forest':
      return Math.round(r() * 6 * k) // 0–6 a hand
    case 'Scout':
      return Math.round((r() * 14 - 2) * k) // a bad hand goes negative
    case 'Mille Bornes':
      return Math.round((2 + r() * 12) * k) * 100 // hundreds of kilometres
    default:
      return Math.round((2 + r() * 12) * k)
  }
}

/** "Who won?": one winner, weighted by skill. */
function pickWinner(playerIds: string[], r: () => number, skill: Record<string, number>): string {
  const weights = playerIds.map((p) => skill[p] ?? 1)
  let roll = r() * weights.reduce((a, b) => a + b, 0)
  for (const [i, w] of weights.entries()) {
    roll -= w
    if (roll <= 0) return playerIds[i]!
  }
  return playerIds.at(-1)!
}

/** Ten finished games between Kate, Blair and Alder, newest first. */
export function makeSamples(clock: Clock, playerIds = ['kate', 'blair', 'alder']): Game[] {
  const r = rng(7)
  const now = clock.now()
  return PLAN.map(([name, goal, target], i): Game => {
    const start = new Date(now - (PLAN.length - i) * 3 * DAY - r() * DAY).toISOString()
    const g: Game = {
      id: `s${i}`,
      sample: true,
      name,
      goal,
      target,
      lowWins: false,
      playerIds: playerIds.slice(),
      rounds: [],
      startedAt: start,
      completedAt: null,
      winnerId: null,
    }
    const skill: Record<string, number> = {}
    for (const p of playerIds) skill[p] = 0.75 + r() * 0.5
    let res = evaluate(g)
    let guard = 0
    while (!res.done && guard++ < 40) {
      let sc: Record<string, number> = {}
      if (goal === 'wins') sc = winRound(playerIds, pickWinner(playerIds, r, skill))
      else for (const p of playerIds) sc[p] = roundScore(name, r, skill[p] ?? 1) || 0
      g.rounds.push({ id: `${g.id}-r${g.rounds.length + 1}`, scores: sc })
      res = evaluate(g)
    }
    g.winnerId = res.done ? res.winner : (ranked(g)[0] ?? null)
    g.completedAt = new Date(new Date(start).getTime() + 40 * 60e3).toISOString()
    return g
  }).reverse()
}

/** First launch: the default household plus the sample history. */
export function freshStore(clock: Clock): Store {
  return { ...emptyStore(), games: makeSamples(clock), hasSamples: true }
}

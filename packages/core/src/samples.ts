import { emptyStore } from './presets'
import type { Clock, Game, Store } from './schemas'
import { evaluate, ranked } from './scoring'

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
  ['Flip 7', 'score', 200],
  ['Sushi Go', 'rounds', 3],
  ['Flip 7', 'score', 200],
  ['Skull King', 'rounds', 10],
  ['Flip 7', 'score', 200],
  ['Sushi Go', 'rounds', 3],
  ['Flip 7', 'score', 200],
  ['Flip 7', 'score', 200],
  ['Sushi Go', 'rounds', 3],
  ['Flip 7', 'score', 200],
]

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
      const sc: Record<string, number> = {}
      for (const p of playerIds) {
        const k = skill[p] ?? 1
        sc[p] =
          name === 'Flip 7'
            ? r() < 0.18
              ? 0
              : Math.round((8 + r() * 45) * k)
            : name === 'Sushi Go'
              ? Math.round((14 + r() * 30) * k)
              : Math.round((r() * 10 - 3) * k) * 10 || 0
      }
      g.rounds.push({ scores: sc })
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

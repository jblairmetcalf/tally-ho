/** Story data only (not exported from the barrel): deterministic games from @tally/core. */
import {
  type Clock,
  computeStats,
  DEFAULT_PLAYERS,
  type Game,
  makeSamples,
  type Player,
  type Round,
  ranked,
  totalsOf,
  winSeries,
} from '@tally/core'

export const clock: Clock = { now: () => Date.parse('2026-10-15T12:00:00Z') }

const PLAYERS: Player[] = [
  ...DEFAULT_PLAYERS,
  { id: 'rowan', name: 'Rowan', color: 3 },
  { id: 'mags', name: 'Mags', color: 4 },
  { id: 'theo', name: 'Theo', color: 5 },
]
export const byId = (id: string): Player =>
  PLAYERS.find((p) => p.id === id) ?? { id, name: id, color: 6 }
export const nameOf = (id: string) => byId(id).name

/** Ten finished sample games, newest first. */
export const SAMPLES: Game[] = makeSamples(clock)

export const stats = (games: Game[] = SAMPLES) => computeStats(games, nameOf)

export const chartSeries = (games: Game[] = SAMPLES) =>
  winSeries(games).map((s) => ({ ...s, name: nameOf(s.id), color: byId(s.id).color }))

export const podiumRows = (g: Game) => {
  const t = totalsOf(g)
  return ranked(g).map((id) => ({ ...byId(id), total: t[id] ?? 0 }))
}

export const gameRowProps = (g: Game) => {
  const t = totalsOf(g)
  const winner = byId(g.winnerId ?? '')
  return {
    name: g.name,
    winner: { name: winner.name, color: winner.color },
    completedAt: g.completedAt ?? new Date(clock.now()).toISOString(),
    rounds: g.rounds.length,
    totals: ranked(g).map((id) => ({
      ...byId(id),
      total: t[id] ?? 0,
      won: id === g.winnerId,
    })),
  }
}

/** Build rounds from rows of scores in player order (null = blank). */
export const rounds = (ids: string[], rows: (number | null)[][]): Round[] =>
  rows.map((row) => ({ scores: Object.fromEntries(ids.map((id, i) => [id, row[i] ?? null])) }))

export const players = (n: number) => PLAYERS.slice(0, n)

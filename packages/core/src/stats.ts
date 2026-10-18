import type { CompletedGame, Game } from './schemas'

export interface Standing {
  id: string
  wins: number
  played: number
}

export interface Stats {
  /** Completed games, oldest first. */
  asc: CompletedGame[]
  /** Most wins first; ties broken by the name lookup so the order is stable. */
  standings: Standing[]
  current: { id: string | null; n: number }
  best: { id: string | null; n: number }
  /** Highest single-round score in a high-wins game. Low-wins games don't brag. */
  big: { v: number; id: string; game: string } | null
  fav: { name: string; count: number } | null
  total: number
}

export function isCompleted(g: Game): g is CompletedGame {
  return g.completedAt != null && g.winnerId != null
}

export function computeStats(games: Game[], nameOf: (id: string) => string = (id) => id): Stats {
  const asc = games.filter(isCompleted).sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  const ids = [...new Set(asc.flatMap((g) => g.playerIds))]
  const wins: Record<string, number> = {}
  const played: Record<string, number> = {}
  for (const p of ids) {
    wins[p] = 0
    played[p] = 0
  }
  for (const g of asc) {
    for (const p of g.playerIds) played[p] = (played[p] ?? 0) + 1
    wins[g.winnerId] = (wins[g.winnerId] ?? 0) + 1
  }

  let current: Stats['current'] = { id: null, n: 0 }
  let best: Stats['best'] = { id: null, n: 0 }
  for (const g of asc) {
    current =
      g.winnerId === current.id ? { id: current.id, n: current.n + 1 } : { id: g.winnerId, n: 1 }
    if (current.n > best.n) best = { ...current }
  }

  let big: Stats['big'] = null
  for (const g of asc) {
    // Low-wins games don't brag, and "Who won?" rounds are 1s and 0s, not scores.
    if (g.lowWins || g.goal === 'wins') continue
    for (const r of g.rounds)
      for (const p of g.playerIds) {
        const v = r.scores[p]
        if (v != null && (big == null || v > big.v)) big = { v, id: p, game: g.name }
      }
  }

  const counts = new Map<string, number>()
  for (const g of asc) counts.set(g.name, (counts.get(g.name) ?? 0) + 1)
  const favEntry = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]

  const standings = ids
    .map((id) => ({ id, wins: wins[id] ?? 0, played: played[id] ?? 0 }))
    .sort((a, b) => b.wins - a.wins || nameOf(a.id).localeCompare(nameOf(b.id)))

  return {
    asc,
    standings,
    current,
    best,
    big,
    fav: favEntry ? { name: favEntry[0], count: favEntry[1] } : null,
    total: asc.length,
  }
}

/** Cumulative wins per player after each game, oldest first, starting at 0. */
export function winSeries(games: Game[]): { id: string; pts: number[] }[] {
  const list = games.filter(isCompleted).sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  const ids = [...new Set(list.flatMap((g) => g.playerIds))]
  return ids.map((id) => {
    let w = 0
    const pts = [0]
    for (const g of list) {
      if (g.winnerId === id) w++
      pts.push(w)
    }
    return { id, pts }
  })
}

import type { Game } from './schemas'

export type Totals = Record<string, number>

/** Pick only what scoring needs, so callers can pass a full Game or a sketch of one. */
type Scored = Pick<Game, 'playerIds' | 'rounds' | 'lowWins'>
type Goaled = Scored & Pick<Game, 'goal' | 'target'>

/** Parse a typed score. Empty or a lone minus is a blank (null), which counts as 0. */
export function parseScore(input: unknown): number | null {
  const s = String(input ?? '').trim()
  if (s === '' || s === '-') return null
  const n = Number.parseInt(s, 10)
  return Number.isNaN(n) ? null : n
}

export function totalsOf(g: Scored): Totals {
  const t: Totals = {}
  for (const p of g.playerIds) t[p] = 0
  for (const r of g.rounds) for (const p of g.playerIds) t[p] = (t[p] ?? 0) + (r.scores[p] ?? 0)
  return t
}

/** Everyone sharing the best total. Best is highest, or lowest when low score wins. */
export function leadersOf(g: Scored): string[] {
  const t = totalsOf(g)
  const vals = g.playerIds.map((p) => t[p] ?? 0)
  const best = g.lowWins ? Math.min(...vals) : Math.max(...vals)
  return g.playerIds.filter((p) => t[p] === best)
}

/** The single leader, or null before the first round or while tied. */
export function leaderOf(g: Scored): string | null {
  if (!g.rounds.length) return null
  const l = leadersOf(g)
  return l.length === 1 ? (l[0] ?? null) : null
}

export type Evaluation = { done: true; winner: string } | { done: false; tie?: boolean }

/**
 * Has the game reached its end condition? A score game ends when anyone reaches the target
 * (for low-wins games that player has "bust" and the lowest total wins). A rounds game ends
 * after the last round. A tie at the end is not a finish: it calls for a tiebreak round.
 */
export function evaluate(g: Goaled): Evaluation {
  const t = totalsOf(g)
  const target = g.target ?? 0
  const reached =
    g.goal === 'score'
      ? g.playerIds.some((p) => (t[p] ?? 0) >= target)
      : g.goal === 'rounds'
        ? g.rounds.length >= target
        : g.goal === 'wins'
          ? g.playerIds.some((p) => (t[p] ?? 0) >= (target || 1))
          : false
  if (!reached) return { done: false }
  const l = leadersOf(g)
  return l.length === 1 && l[0] ? { done: true, winner: l[0] } : { done: false, tie: true }
}

/** Players best-first. */
export function ranked(g: Scored): string[] {
  const t = totalsOf(g)
  const dir = g.lowWins ? 1 : -1
  return [...g.playerIds].sort((a, b) => dir * ((t[a] ?? 0) - (t[b] ?? 0)))
}

/**
 * "Match point": within 15% of the target and not over it. In a high-wins race that is
 * a threat to everyone else; in a low-wins game it is danger for that player.
 */
export const MATCH_POINT = 0.85
export function nearTarget(g: Goaled, total: number): boolean {
  return (
    g.goal === 'score' && g.target != null && total >= g.target * MATCH_POINT && total < g.target
  )
}

export function goalLabel(g: Pick<Game, 'goal' | 'target' | 'lowWins'>): string {
  const base =
    g.goal === 'score'
      ? g.lowWins
        ? `Bust at ${g.target}`
        : `Race to ${g.target}`
      : g.goal === 'rounds'
        ? g.target === 1
          ? 'Final scores'
          : `${g.target} rounds`
        : g.goal === 'wins'
          ? (g.target ?? 1) <= 1
            ? 'Who won?'
            : `First to ${g.target} wins`
          : 'Open-ended'
  return g.lowWins && g.goal !== 'score' ? `${base} · low wins` : base
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  return n + (s[((n % 100) - 20) % 10] ?? s[n % 100] ?? 'th')
}

/** Stable small hash, used to give unknown names a palette slot. */
export function hash(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

/** A "Who won?" round: the winner scores 1, everyone else 0 (so totals are win counts). */
export function winRound(playerIds: string[], winnerId: string): Record<string, number> {
  return Object.fromEntries(playerIds.map((p) => [p, p === winnerId ? 1 : 0]))
}

/** The round count for a game dealt from a preset (one round per player for Scout-like games). */
export function targetFor(
  preset: Pick<Game, 'goal' | 'target'> & { roundsPerPlayer?: boolean },
  players: number,
): number | null {
  if (preset.goal === 'open') return null
  if (preset.goal === 'rounds' && preset.roundsPerPlayer) return Math.max(1, players)
  if (preset.goal === 'wins') return Math.max(1, preset.target ?? 1)
  return preset.target
}

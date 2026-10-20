import type { CompletedGame, Game } from './schemas'
import { isCompleted } from './stats'

/**
 * The Sticker Club (docs/DECISIONS.md 24): stickers players earn from finished games. They are
 * derived from the games, never stored, so every family phone agrees, the demo earns them from
 * its samples, and deleting a game takes its stickers with it. The words live in the app's copy;
 * here is only what decides who earns what, and how each sticker looks.
 */

export type StickerId =
  | 'crown'
  | 'hat'
  | 'comeback'
  | 'wire'
  | 'photo'
  | 'steam'
  | 'bust'
  | 'marathon'
  | 'polymath'
  | 'ten'
  | 'owl'
  | 'underdog'

/** A sticker's look: its colour (an accent token), its icon and its die-cut shape. */
export interface StickerKind {
  id: StickerId
  tone: 'amber' | 'fox' | 'jade' | 'lav' | 'coral' | 'sky'
  icon: string
  shape: 'circle' | 'burst' | 'hex' | 'square'
}

/** All twelve, in album order. */
export const STICKERS: readonly StickerKind[] = [
  { id: 'crown', tone: 'amber', icon: 'crown', shape: 'circle' },
  { id: 'hat', tone: 'fox', icon: 'flame', shape: 'burst' },
  { id: 'comeback', tone: 'jade', icon: 'rocket', shape: 'hex' },
  { id: 'wire', tone: 'lav', icon: 'route', shape: 'square' },
  { id: 'photo', tone: 'coral', icon: 'camera', shape: 'circle' },
  { id: 'steam', tone: 'fox', icon: 'weight', shape: 'burst' },
  { id: 'bust', tone: 'coral', icon: 'zero', shape: 'hex' },
  { id: 'marathon', tone: 'jade', icon: 'clock', shape: 'square' },
  { id: 'polymath', tone: 'lav', icon: 'cards', shape: 'circle' },
  { id: 'ten', tone: 'amber', icon: 'trophy', shape: 'burst' },
  { id: 'owl', tone: 'sky', icon: 'moon', shape: 'hex' },
  { id: 'underdog', tone: 'sky', icon: 'underdog', shape: 'square' },
]

/** Tunable thresholds, as fractions of the game's own scale (so 21-point and 1000-point games both work). */
export const STICKER_RULES = {
  /** Comeback Kid: trailed the leader by at least this share of the scale. */
  comeback: 0.25,
  /** Photo Finish: won by at most this share of the winner's total (and never less than 1). */
  photo: 0.05,
  /** Steamroller: the winner's total is this many times the runner-up's (reversed when low wins). */
  steam: 1.5,
  /** Marathon: this many rounds or more. */
  marathon: 10,
  /** Night Owl: finished at or after this hour, or before `owlUntil` (the phone's local time). */
  owlFrom: 22,
  owlUntil: 4,
} as const

export interface EarnedSticker {
  playerId: string
  id: StickerId
  /** Their first of this sticker. */
  isNew: boolean
}

export interface StickerBook {
  /** How many of each sticker each player has. */
  counts: Record<string, Partial<Record<StickerId, number>>>
  /** What each finished game gave out, in the order it was earned. */
  byGame: Record<string, EarnedSticker[]>
  /** Every sticker earned, newest game first. */
  recent: (EarnedSticker & { gameId: string; game: string; at: string })[]
}

/** How many different stickers a player has (of `STICKERS.length`). */
export function stickersOf(book: StickerBook, playerId: string): number {
  return Object.keys(book.counts[playerId] ?? {}).length
}

/** Totals after the first `k` rounds. */
export function totalsAt(g: Pick<Game, 'playerIds' | 'rounds'>, k: number): Record<string, number> {
  const t: Record<string, number> = {}
  for (const p of g.playerIds) t[p] = 0
  for (const r of g.rounds.slice(0, k))
    for (const p of g.playerIds) t[p] = (t[p] ?? 0) + (r.scores[p] ?? 0)
  return t
}

const isFirstTo = (g: Game) => g.goal === 'wins' && (g.target ?? 1) >= 2
const isPoints = (g: Game) => g.goal !== 'wins'

/** The round's winner in a "Who won?" game (the one scored 1). */
const roundWinner = (g: Game, i: number) =>
  g.playerIds.find((p) => (g.rounds[i]?.scores[p] ?? 0) > 0) ?? null

/** How good a total is: higher is better, or lower when low score wins. */
const good = (g: Game, v: number) => (g.lowWins ? -v : v)

/** The single best player after `k` rounds, or null while tied. */
function soleLeaderAt(g: Game, k: number): string | null {
  const t = totalsAt(g, k)
  const best = Math.max(...g.playerIds.map((p) => good(g, t[p] ?? 0)))
  const top = g.playerIds.filter((p) => good(g, t[p] ?? 0) === best)
  return top.length === 1 ? (top[0] ?? null) : null
}

/** Players best-first by final total. */
function order(g: Game, t: Record<string, number>): string[] {
  return [...g.playerIds].sort((a, b) => good(g, t[b] ?? 0) - good(g, t[a] ?? 0))
}

function comeback(g: CompletedGame): boolean {
  const w = g.winnerId
  if (isFirstTo(g)) return g.rounds.length > 1 && roundWinner(g, 0) !== w
  if (!isPoints(g) || g.rounds.length < 2) return false
  const final = totalsAt(g, g.rounds.length)
  const scale =
    g.goal === 'score' && g.target
      ? g.target
      : Math.max(...g.playerIds.map((p) => Math.abs(final[p] ?? 0)))
  if (scale <= 0) return false
  let deficit = 0
  for (let k = 1; k <= g.rounds.length; k++) {
    const t = totalsAt(g, k)
    const best = Math.max(...g.playerIds.map((p) => good(g, t[p] ?? 0)))
    deficit = Math.max(deficit, best - good(g, t[w] ?? 0))
  }
  return deficit >= STICKER_RULES.comeback * scale
}

function wire(g: CompletedGame): boolean {
  if (g.rounds.length < 3 || !(isPoints(g) || isFirstTo(g))) return false
  for (let k = 1; k <= g.rounds.length; k++) if (soleLeaderAt(g, k) !== g.winnerId) return false
  return true
}

function photo(g: CompletedGame): boolean {
  const w = g.winnerId
  if (isFirstTo(g)) {
    // The decider: before the last round, the winner and someone else were both one win away.
    const n = g.target ?? 1
    const before = totalsAt(g, g.rounds.length - 1)
    return (
      (before[w] ?? 0) === n - 1 && g.playerIds.some((p) => p !== w && (before[p] ?? 0) === n - 1)
    )
  }
  if (!isPoints(g) || !g.rounds.length) return false
  const t = totalsAt(g, g.rounds.length)
  const second = order(g, t).find((p) => p !== w)
  if (!second) return false
  const margin = Math.abs((t[w] ?? 0) - (t[second] ?? 0))
  return margin <= Math.max(1, STICKER_RULES.photo * Math.abs(t[w] ?? 0))
}

function steam(g: CompletedGame): boolean {
  const w = g.winnerId
  if (isFirstTo(g)) return g.rounds.every((_, i) => roundWinner(g, i) === w)
  if (!isPoints(g) || g.rounds.length < 2) return false
  const t = totalsAt(g, g.rounds.length)
  const second = order(g, t).find((p) => p !== w)
  if (!second) return false
  const [mine, theirs] = [t[w] ?? 0, t[second] ?? 0]
  return g.lowWins
    ? theirs > 0 && theirs >= STICKER_RULES.steam * Math.max(mine, 0) && mine >= 0
    : theirs > 0 && mine >= STICKER_RULES.steam * theirs
}

/** Scored nothing in a round while everyone else scored (high-score points games). */
function busted(g: CompletedGame, p: string): boolean {
  if (!isPoints(g) || g.lowWins || g.playerIds.length < 2) return false
  return g.rounds.some(
    (r) => (r.scores[p] ?? 0) === 0 && g.playerIds.every((q) => q === p || (r.scores[q] ?? 0) > 0),
  )
}

function lateNight(at: string): boolean {
  const h = new Date(at).getHours()
  return h >= STICKER_RULES.owlFrom || h < STICKER_RULES.owlUntil
}

/**
 * Every sticker earned in `games`, oldest game first (finished games only; samples count like
 * any other game). Pure: no clock, no storage. Night Owl reads the finish time in this phone's
 * time zone.
 */
export function computeStickers(games: Game[]): StickerBook {
  const asc = games.filter(isCompleted).sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  const book: StickerBook = { counts: {}, byGame: {}, recent: [] }
  const wins: Record<string, number> = {}
  const kinds: Record<string, Set<string>> = {}
  let streak: { id: string | null; n: number } = { id: null, n: 0 }

  for (const g of asc) {
    const w = g.winnerId
    const earned: EarnedSticker[] = []
    const give = (p: string, id: StickerId) => {
      const mine = book.counts[p] ?? {}
      book.counts[p] = mine
      const isNew = !mine[id]
      mine[id] = (mine[id] ?? 0) + 1
      earned.push({ playerId: p, id, isNew })
    }

    // Underdog reads the standings as they were before this game.
    const known = Object.keys(wins)
    if (known.includes(w) && known.length >= 2) {
      const mine = wins[w] ?? 0
      const others = known.filter((p) => p !== w).map((p) => wins[p] ?? 0)
      if (mine <= Math.min(...others) && mine < Math.max(...others)) give(w, 'underdog')
    }
    for (const p of g.playerIds) wins[p] ??= 0
    wins[w] = (wins[w] ?? 0) + 1

    if (wins[w] === 1) give(w, 'crown')
    if (wins[w] === 10) give(w, 'ten')
    streak = streak.id === w ? { id: w, n: streak.n + 1 } : { id: w, n: 1 }
    if (streak.n % 3 === 0) give(w, 'hat')
    const mineKinds = kinds[w] ?? new Set<string>()
    kinds[w] = mineKinds
    const had = mineKinds.size
    mineKinds.add(g.name.trim().toLowerCase())
    if (had < 3 && mineKinds.size === 3) give(w, 'polymath')

    if (comeback(g)) give(w, 'comeback')
    if (wire(g)) give(w, 'wire')
    if (photo(g)) give(w, 'photo')
    if (steam(g)) give(w, 'steam')
    for (const p of g.playerIds) if (busted(g, p)) give(p, 'bust')
    if (g.rounds.length >= STICKER_RULES.marathon) for (const p of g.playerIds) give(p, 'marathon')
    if (lateNight(g.completedAt)) for (const p of g.playerIds) give(p, 'owl')

    book.byGame[g.id] = earned
    for (const e of earned)
      book.recent.push({ ...e, gameId: g.id, game: g.name, at: g.completedAt })
  }
  book.recent.reverse()
  return book
}

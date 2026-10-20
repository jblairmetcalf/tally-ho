import {
  type Game,
  GameSchema,
  type Player,
  PlayerSchema,
  type Preset,
  PresetSchema,
  type Round,
  RoundSchema,
} from '@tally/core'

/** The synced collections. Prefs and `lastPlayerIds` stay on the phone. */
export type Col = 'players' | 'presets' | 'games'
export const COLS: readonly Col[] = ['players', 'presets', 'games']

export type DocData = Record<string, unknown>

/** Firestore refuses `undefined`: drop those keys (deeply). */
export function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = clean(v)
    return out as T
  }
  return value
}

/** Structural equality; key order doesn't matter and an `undefined` key counts as absent. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]))
  const ao = a as Record<string, unknown>
  const bo = b as Record<string, unknown>
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)])
  for (const k of keys) if (!deepEqual(ao[k], bo[k])) return false
  return true
}

// ─────────────────────────────── Store → documents ───────────────────────────────

export const playerDoc = (p: Player): DocData =>
  clean({ id: p.id, name: p.name.slice(0, 16), color: p.color, archived: p.archived })

export const presetDoc = (p: Preset): DocData =>
  clean({
    id: p.id,
    name: p.name.slice(0, 32),
    goal: p.goal,
    target: p.target,
    lowWins: p.lowWins,
    // Optional: absent on older docs and on every preset that isn't one round per dealer.
    roundsPerPlayer: p.roundsPerPlayer,
    // Optional: absent on older docs (the app falls back to the built-in default for the id).
    // `maxPlayers: null` is a real value: "no limit", chosen in the editor.
    minPlayers: p.minPlayers,
    maxPlayers: p.maxPlayers,
  })

export const roundDoc = (r: Round, by?: string): DocData =>
  clean({ scores: r.scores, at: r.at, by: r.by ?? by })

/** Every field the rules require. `rounds` is a map by round id so concurrent rounds merge. */
export function gameDoc(g: Game, by?: string): DocData {
  const rounds: DocData = {}
  g.rounds.forEach((r, i) => {
    rounds[r.id ?? `${g.id}-r${i + 1}`] = roundDoc(r, by)
  })
  return clean({
    id: g.id,
    name: g.name.slice(0, 40),
    goal: g.goal,
    target: g.target,
    lowWins: g.lowWins,
    playerIds: g.playerIds,
    startedAt: g.startedAt,
    completedAt: g.completedAt ?? null,
    winnerId: g.winnerId ?? null,
    startedBy: g.startedBy ?? by,
    rounds,
  })
}

// ─────────────────────────────── documents → Store ───────────────────────────────

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** A natural compare (`r2` before `r10`) that never depends on the device's locale. */
export function naturalCompare(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g
  const as = a.match(re) ?? []
  const bs = b.match(re) ?? []
  for (let i = 0; i < Math.min(as.length, bs.length); i++) {
    const x = as[i]!
    const y = bs[i]!
    if (x === y) continue
    const nx = /^\d/.test(x) && /^\d/.test(y)
    if (nx && Number(x) !== Number(y)) return Number(x) - Number(y)
    return x < y ? -1 : 1
  }
  return as.length - bs.length
}

export function playerFrom(id: string, data: DocData): Player | null {
  const r = PlayerSchema.safeParse({ ...data, id })
  return r.success ? r.data : null
}

export function presetFrom(id: string, data: DocData): Preset | null {
  const r = PresetSchema.safeParse({ ...data, id })
  return r.success ? r.data : null
}

/** Null for a soft-deleted or unreadable game. Rounds sorted by `at`, then id. */
export function gameFrom(id: string, data: DocData): Game | null {
  if (data.deletedAt != null) return null
  const map = data.rounds && typeof data.rounds === 'object' ? (data.rounds as DocData) : {}
  const rounds: Round[] = []
  for (const [rid, raw] of Object.entries(map)) {
    const r = RoundSchema.safeParse({ ...(raw as DocData), id: rid })
    if (r.success) rounds.push(r.data)
  }
  rounds.sort((a, b) => {
    const at = cmp(a.at ?? '', b.at ?? '')
    return at || naturalCompare(a.id ?? '', b.id ?? '')
  })
  const { deletedAt: _d, updatedAt: _u, ...rest } = data
  const r = GameSchema.safeParse({ ...rest, id, rounds })
  return r.success ? r.data : null
}

/** Live game (newest unfinished) and finished games newest first, from all game documents. */
export function splitGames(all: Game[]): { active: Game | null; games: Game[] } {
  const live = all
    .filter((g) => g.completedAt == null)
    .sort((a, b) => cmp(b.startedAt, a.startedAt) || naturalCompare(b.id, a.id))
  const games = all
    .filter((g) => g.completedAt != null)
    .sort((a, b) => cmp(b.completedAt ?? '', a.completedAt ?? '') || naturalCompare(b.id, a.id))
  return { active: live[0] ?? null, games }
}

/**
 * Keep the order this phone already shows; newcomers go at the end, by id. Player and preset
 * order is cosmetic and device-local (documents have no position).
 */
export function keepOrder<T extends { id: string }>(prev: T[], next: T[]): T[] {
  const pos = new Map(prev.map((x, i) => [x.id, i]))
  return next.slice().sort((a, b) => {
    const pa = pos.get(a.id)
    const pb = pos.get(b.id)
    if (pa != null && pb != null) return pa - pb
    if (pa != null) return -1
    if (pb != null) return 1
    return naturalCompare(a.id, b.id)
  })
}

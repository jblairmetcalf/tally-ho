import { z } from 'zod'
import { DEFAULT_PREFS, DEFAULT_PRESETS } from './presets'
import {
  type Game,
  GoalSchema,
  PALETTE_SIZE,
  type Player,
  type Store,
  StoreSchema,
} from './schemas'
import { hash } from './scoring'

/** The prototype's `tallyho.v2` localStorage shape: everything keyed by player name. */
const V2Game = z.object({
  id: z.string(),
  sample: z.boolean().optional(),
  name: z.string(),
  goal: GoalSchema.catch('open'),
  target: z.number().nullable().optional(),
  players: z.array(z.string()),
  rounds: z.array(
    z.object({ scores: z.record(z.string(), z.number().nullable()), at: z.string().optional() }),
  ),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  winner: z.string().nullable().optional(),
})
const V2Store = z.object({
  games: z.array(V2Game),
  active: V2Game.nullable().optional(),
  colors: z.record(z.string(), z.number()).optional(),
  lastPlayers: z.array(z.string()).optional(),
  muted: z.boolean().optional(),
  hasSamples: z.boolean().optional(),
})

export function slug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `p${hash(name)}`
  )
}

function fromV2(v2: z.infer<typeof V2Store>): Store {
  const names = new Set<string>()
  for (const g of [...v2.games, ...(v2.active ? [v2.active] : [])])
    for (const p of g.players) names.add(p)
  for (const p of v2.lastPlayers ?? []) names.add(p)

  const idOf = new Map<string, string>()
  const players: Player[] = []
  for (const name of names) {
    let id = slug(name)
    while (players.some((p) => p.id === id)) id += '-2'
    idOf.set(name, id)
    players.push({
      id,
      name: name.slice(0, 16),
      color: (v2.colors?.[name] ?? hash(name)) % PALETTE_SIZE,
    })
  }
  const id = (n: string) => idOf.get(n) ?? slug(n)

  const game = (g: z.infer<typeof V2Game>): Game => ({
    id: g.id,
    ...(g.sample ? { sample: true } : {}),
    name: g.name,
    goal: g.goal,
    target: g.goal === 'open' ? null : (g.target ?? null),
    lowWins: false,
    playerIds: g.players.map(id),
    rounds: g.rounds.map((r) => ({
      scores: Object.fromEntries(Object.entries(r.scores).map(([n, v]) => [id(n), v])),
      ...(r.at ? { at: r.at } : {}),
    })),
    startedAt: g.startedAt,
    completedAt: g.completedAt ?? null,
    winnerId: g.winner ? id(g.winner) : null,
  })

  return {
    version: 3,
    players,
    presets: DEFAULT_PRESETS.map((p) => ({ ...p })),
    games: v2.games.map(game),
    active: v2.active ? game(v2.active) : null,
    lastPlayerIds: (v2.lastPlayers ?? []).map(id),
    prefs: { ...DEFAULT_PREFS, muted: !!v2.muted },
    hasSamples: !!v2.hasSamples,
  }
}

/**
 * Turn whatever was saved into a valid Store, or null if it is unreadable.
 * Accepts the current v3 shape and the prototype's v2 shape.
 */
export function migrate(raw: unknown): Store | null {
  const v3 = StoreSchema.safeParse(raw)
  if (v3.success) return v3.data
  const v2 = V2Store.safeParse(raw)
  if (v2.success) {
    const out = StoreSchema.safeParse(fromV2(v2.data))
    return out.success ? out.data : null
  }
  return null
}

import { z } from 'zod'

/** How many chip colours the palette has. Player colours are indices into it. */
export const PALETTE_SIZE = 8

/**
 * How a game ends. `score`: first to `target` points. `rounds`: after `target` rounds (1 round =
 * one final tally). `wins`: "Who won?" — each round has one winner, first to `target` wins (1 =
 * a single game). `open`: when you say so.
 */
export const GoalSchema = z.enum(['score', 'rounds', 'wins', 'open'])
export type Goal = z.infer<typeof GoalSchema>

/** A song's key and chord loop (the Fox Trot, decision 27). */
export const SongKeySchema = z.object({
  /** 0 = C … 11 = B. */
  tonic: z.number().int().min(0).max(11),
  mode: z.enum(['major', 'minor']),
  /** Which of the mode's four loops (`LOOPS` in mixtape.ts). */
  loop: z.number().int().min(0).max(3),
})
export type SongKey = z.infer<typeof SongKeySchema>

export const PlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(16),
  color: z
    .number()
    .int()
    .min(0)
    .max(PALETTE_SIZE - 1),
  archived: z.boolean().optional(),
})
export type Player = z.infer<typeof PlayerSchema>

export const PresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(32),
  goal: GoalSchema,
  target: z.number().int().positive().nullable(),
  lowWins: z.boolean(),
  /** `rounds` games with one round per dealer (no default uses it now): the target follows the line-up. */
  roundsPerPlayer: z.boolean().optional(),
  /**
   * How many can play (2–12). Absent: the built-in default for this id, else 2. The editor
   * always writes it, so a family's choice sticks.
   */
  minPlayers: z.number().int().min(2).max(12).optional(),
  /** At most this many; `null` = no limit. Absent: the built-in default for this id, else none. */
  maxPlayers: z.number().int().min(2).max(12).nullable().optional(),
  /** The game type's song key; absent: from its name (the Fox Trot, decision 27). */
  song: SongKeySchema.optional(),
})
export type Preset = z.infer<typeof PresetSchema>

/** A blank score is stored as null and counts as 0. */
export const RoundSchema = z.object({
  /** Stable id: rounds sync as a map keyed by it, so two phones scoring at once both land. */
  id: z.string().optional(),
  scores: z.record(z.string(), z.number().int().nullable()),
  at: z.string().optional(),
  /** Who scored it (a player id), filled in by the synced provider. */
  by: z.string().optional(),
})
export type Round = z.infer<typeof RoundSchema>

export const GameSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  goal: GoalSchema,
  target: z.number().int().positive().nullable(),
  lowWins: z.boolean(),
  playerIds: z.array(z.string()).min(2),
  rounds: z.array(RoundSchema),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  winnerId: z.string().nullable(),
  sample: z.boolean().optional(),
  /** Who dealt it in (a player id), filled in by the synced provider. */
  startedBy: z.string().optional(),
  /** The song key, copied from the preset at deal-in so later edits never re-key old songs. */
  song: SongKeySchema.optional(),
})
export type Game = z.infer<typeof GameSchema>
/** A game that has been finished and crowned. */
export type CompletedGame = Game & { completedAt: string; winnerId: string }

export const ThemePrefSchema = z.enum(['system', 'dark', 'light'])
export type ThemePref = z.infer<typeof ThemePrefSchema>

export const PrefsSchema = z.object({
  theme: ThemePrefSchema,
  muted: z.boolean(),
  haptics: z.boolean(),
  wakeLock: z.boolean(),
  /**
   * The install guide has been seen (or dismissed), so it never pops up by itself again.
   * Device-local like every pref; saved prefs from before it existed get `false`.
   */
  installHintSeen: z.boolean().default(false),
})
export type Prefs = z.infer<typeof PrefsSchema>

export const StoreSchema = z.object({
  version: z.literal(3),
  players: z.array(PlayerSchema),
  presets: z.array(PresetSchema),
  games: z.array(GameSchema),
  active: GameSchema.nullable(),
  lastPlayerIds: z.array(z.string()),
  prefs: PrefsSchema,
  hasSamples: z.boolean(),
})
export type Store = z.infer<typeof StoreSchema>

/** Time is injected so logic and fixtures stay deterministic. */
export interface Clock {
  now(): number
}
export const systemClock: Clock = { now: () => Date.now() }

import { z } from 'zod'

/** How many chip colours the palette has. Player colours are indices into it. */
export const PALETTE_SIZE = 8

export const GoalSchema = z.enum(['score', 'rounds', 'open'])
export type Goal = z.infer<typeof GoalSchema>

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
})
export type Preset = z.infer<typeof PresetSchema>

/** A blank score is stored as null and counts as 0. */
export const RoundSchema = z.object({
  scores: z.record(z.string(), z.number().int().nullable()),
  at: z.string().optional(),
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
  /** iOS: play sounds even with the Ring/Silent switch on. Added after v3 shipped: defaults on. */
  soundInSilent: z.boolean().default(true),
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

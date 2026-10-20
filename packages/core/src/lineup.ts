import { slug } from './migrate'
import { DEFAULT_PRESETS } from './presets'
import type { Preset } from './schemas'

/** How many can play a game: at least `min`, at most `max` (`null`: as many as you like). */
export interface PlayerRange {
  min: number
  max: number | null
}

/** The app's floor: every game needs two. */
export const MIN_PLAYERS = 2
/** The most a game can seat (the rules' and the schema's ceiling). */
export const MAX_PLAYERS = 12

type Limits = Pick<Preset, 'id' | 'minPlayers' | 'maxPlayers'>

/**
 * A game's player range: its own `minPlayers` / `maxPlayers`, falling back field by field to the
 * built-in default with the same id (so a family record seeded before the fields existed still
 * knows The Fox in the Forest is for two), then to 2 or more.
 */
export function playerRangeOf(preset: Limits | null | undefined): PlayerRange {
  const builtin = preset ? DEFAULT_PRESETS.find((p) => p.id === preset.id) : undefined
  const min = preset?.minPlayers ?? builtin?.minPlayers ?? MIN_PLAYERS
  const max = preset?.maxPlayers !== undefined ? preset.maxPlayers : (builtin?.maxPlayers ?? null)
  return { min, max: max == null ? null : Math.max(min, max) }
}

/**
 * The range for a game by its name: the family's preset of that name (or slug), else a built-in
 * one (a game typed into Other as "The Fox in the Forest" counts too), else 2 or more.
 */
export function rangeForGame(presets: Preset[], name: string): PlayerRange {
  const key = name.trim().toLowerCase()
  const id = slug(name)
  const own = presets.find((p) => p.id === id || p.name.trim().toLowerCase() === key)
  return playerRangeOf(own ?? DEFAULT_PRESETS.find((p) => p.id === id) ?? null)
}

/** Whether `count` players fit the range. */
export function fitsRange({ min, max }: PlayerRange, count: number): boolean {
  return count >= min && (max == null || count <= max)
}

/** Whether a range says anything beyond the floor of two (worth showing). */
export const isLimited = ({ min, max }: PlayerRange): boolean => min > MIN_PLAYERS || max != null

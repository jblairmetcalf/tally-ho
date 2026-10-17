import type { Player, Prefs, Preset, Store } from './schemas'

/**
 * The family's games. Race-to games end on points; Scout is a round per dealer (three of us)
 * and Sushi Go is three rounds; the rest end when you say so (the flag crowns the leader).
 */
export const DEFAULT_PRESETS: Preset[] = [
  { id: 'monopoly-deal', name: 'Monopoly Deal', goal: 'open', target: null, lowWins: false },
  { id: 'high-society', name: 'High Society', goal: 'open', target: null, lowWins: false },
  { id: 'scout', name: 'Scout', goal: 'rounds', target: 3, lowWins: false },
  { id: 'mille-bornes', name: 'Mille Bornes', goal: 'score', target: 5000, lowWins: false },
  { id: 'push', name: 'Push', goal: 'open', target: null, lowWins: false },
  { id: 'spicy', name: 'Spicy', goal: 'open', target: null, lowWins: false },
  {
    id: 'the-fox-in-the-forest',
    name: 'The Fox in the Forest',
    goal: 'score',
    target: 21,
    lowWins: false,
  },
  { id: 'uno', name: 'Uno', goal: 'score', target: 500, lowWins: false },
  { id: 'flip-7', name: 'Flip 7', goal: 'score', target: 200, lowWins: false },
  { id: 'sushi-go', name: 'Sushi Go', goal: 'rounds', target: 3, lowWins: false },
]

export const DEFAULT_PLAYERS: Player[] = [
  { id: 'kate', name: 'Kate', color: 0 },
  { id: 'blair', name: 'Blair', color: 1 },
  { id: 'alder', name: 'Alder', color: 2 },
]

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  muted: false,
  haptics: true,
  wakeLock: true,
}

/** An empty household: no games, no samples. */
export function emptyStore(): Store {
  return {
    version: 3,
    players: DEFAULT_PLAYERS.map((p) => ({ ...p })),
    presets: DEFAULT_PRESETS.map((p) => ({ ...p })),
    games: [],
    active: null,
    lastPlayerIds: DEFAULT_PLAYERS.map((p) => p.id),
    prefs: { ...DEFAULT_PREFS },
    hasSamples: false,
  }
}

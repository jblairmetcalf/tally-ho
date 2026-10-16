import type { Player, Prefs, Preset, Store } from './schemas'

/** The prototype's eight, plus three games where the lowest score wins. */
export const DEFAULT_PRESETS: Preset[] = [
  { id: 'flip-7', name: 'Flip 7', goal: 'score', target: 200, lowWins: false },
  { id: 'sushi-go', name: 'Sushi Go', goal: 'rounds', target: 3, lowWins: false },
  { id: 'sushi-go-party', name: 'Sushi Go Party', goal: 'rounds', target: 3, lowWins: false },
  { id: 'skull-king', name: 'Skull King', goal: 'rounds', target: 10, lowWins: false },
  { id: 'uno', name: 'Uno', goal: 'score', target: 500, lowWins: false },
  { id: 'cribbage', name: 'Cribbage', goal: 'score', target: 121, lowWins: false },
  { id: 'spades', name: 'Spades', goal: 'score', target: 500, lowWins: false },
  { id: 'rummy', name: 'Rummy', goal: 'score', target: 500, lowWins: false },
  { id: 'hearts', name: 'Hearts', goal: 'score', target: 100, lowWins: true },
  { id: 'golf', name: 'Golf', goal: 'rounds', target: 9, lowWins: true },
  { id: 'skyjo', name: 'Skyjo', goal: 'score', target: 100, lowWins: true },
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

import type { Player, Prefs, Preset, Store } from './schemas'

/**
 * The family's games, set up the way their rulebooks end them (researched 2026-10, docs/DECISIONS.md):
 * - Who won? (`wins`): won outright, not on points: Monopoly Deal (3 full sets), Schotten Totten
 *   (5 stones or 3 adjacent), High Society (the poorest is out, so top score needn't win), Spicy
 *   (two trophies), Uno (official since 2022: first out wins). Jaipur: first to 2 Seals.
 * - Score races: Mille Bornes 1000 (the family's game: one 1000 km trip; the rulebook's full game
 *   is 5000), The Fox in the Forest 21 (16/35 variants), Flip 7 200.
 * - Rounds: Sushi Go 3; Scout one per player; Push is one final tally when the deck runs out.
 */
export const DEFAULT_PRESETS: Preset[] = [
  { id: 'monopoly-deal', name: 'Monopoly Deal', goal: 'wins', target: 1, lowWins: false },
  { id: 'high-society', name: 'High Society', goal: 'wins', target: 1, lowWins: false },
  {
    id: 'scout',
    name: 'Scout',
    goal: 'rounds',
    target: 3,
    lowWins: false,
    roundsPerPlayer: true,
  },
  { id: 'mille-bornes', name: 'Mille Bornes', goal: 'score', target: 1000, lowWins: false },
  { id: 'push', name: 'Push', goal: 'rounds', target: 1, lowWins: false },
  { id: 'spicy', name: 'Spicy', goal: 'wins', target: 1, lowWins: false },
  {
    id: 'the-fox-in-the-forest',
    name: 'The Fox in the Forest',
    goal: 'score',
    target: 21,
    lowWins: false,
  },
  { id: 'uno', name: 'Uno', goal: 'wins', target: 1, lowWins: false },
  { id: 'flip-7', name: 'Flip 7', goal: 'score', target: 200, lowWins: false },
  { id: 'sushi-go', name: 'Sushi Go', goal: 'rounds', target: 3, lowWins: false },
  { id: 'jaipur', name: 'Jaipur', goal: 'wins', target: 2, lowWins: false },
  { id: 'schotten-totten', name: 'Schotten Totten', goal: 'wins', target: 1, lowWins: false },
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
  installHintSeen: false,
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

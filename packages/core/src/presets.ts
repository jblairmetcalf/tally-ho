import type { Player, Prefs, Preset, Store } from './schemas'

/**
 * The family's games. Researched from the rulebooks (docs/DECISIONS.md 16), then set to how the
 * family actually plays (19):
 * - Who won? (`wins`): Monopoly Deal, High Society, Spicy, Uno, Schotten Totten, Bananagrams by their rules;
 *   The Fox in the Forest (rulebook: race to 21), Scout (one round per player) and Mille Bornes
 *   (race to 5000) by family choice. Jaipur: first to 2 Seals.
 * - Score race: Flip 7 200; Bocce 10 (family choice: rulebooks play to 12, 13 or 16). Rounds: Sushi Go 3; Push is one final tally when the deck runs out.
 */
export const DEFAULT_PRESETS: Preset[] = [
  { id: 'monopoly-deal', name: 'Monopoly Deal', goal: 'wins', target: 1, lowWins: false },
  // High Society: 3 or more (the family's rule; the box says 3–5).
  {
    id: 'high-society',
    name: 'High Society',
    goal: 'wins',
    target: 1,
    lowWins: false,
    minPlayers: 3,
    maxPlayers: null,
  },
  { id: 'scout', name: 'Scout', goal: 'wins', target: 1, lowWins: false },
  { id: 'mille-bornes', name: 'Mille Bornes', goal: 'wins', target: 1, lowWins: false },
  { id: 'push', name: 'Push', goal: 'rounds', target: 1, lowWins: false },
  { id: 'spicy', name: 'Spicy', goal: 'wins', target: 1, lowWins: false },
  {
    id: 'the-fox-in-the-forest',
    name: 'The Fox in the Forest',
    goal: 'wins',
    target: 1,
    lowWins: false,
    // A two-player game.
    minPlayers: 2,
    maxPlayers: 2,
  },
  { id: 'uno', name: 'Uno', goal: 'wins', target: 1, lowWins: false },
  { id: 'flip-7', name: 'Flip 7', goal: 'score', target: 200, lowWins: false },
  { id: 'sushi-go', name: 'Sushi Go', goal: 'rounds', target: 3, lowWins: false },
  { id: 'jaipur', name: 'Jaipur', goal: 'wins', target: 2, lowWins: false },
  { id: 'schotten-totten', name: 'Schotten Totten', goal: 'wins', target: 1, lowWins: false },
  // Bananagrams: the first to use all their tiles once the bunch is empty calls "Bananas!" and wins.
  { id: 'bananagrams', name: 'Bananagrams', goal: 'wins', target: 1, lowWins: false },
  // Bocce: frames until a side reaches the target. Rulebooks say 12 (13 or 16 in some leagues);
  // the family plays to 10.
  { id: 'bocce', name: 'Bocce', goal: 'score', target: 10, lowWins: false },
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

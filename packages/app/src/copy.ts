/**
 * Every user-facing string in the app. Strings marked (prototype) are verbatim from
 * `docs/imports/Tally Ho!.html`; the rest are new (settings, low-wins, saved players).
 */

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`

export const COPY = {
  app: { name: 'Tally Ho!' },

  // Header controls (prototype + gear)
  soundOn: 'Turn sound on',
  soundOff: 'Turn sound off',
  settingsLabel: 'Settings',
  back: 'Back to home',
  endGameLabel: 'End game',
  close: 'Close',

  home: {
    samples:
      'These are sample games so you can see the scoreboard. They clear when you start your first real game.',
    clear: 'Clear',
    inProgress: 'In progress',
    resumeSub: (round: number, goal: string) => `Round ${round} · ${goal}`,
    emptyTitle: 'No games yet',
    emptyBody: 'Deal the first hand and the leaderboard starts here.',
    newGame: 'New game',
    standings: 'Standings',
    wins: 'Wins',
    overTime: "Who's winning over time",
    gamesPlayed: 'Games played',
    longestStreak: (name: string | null) => (name ? `Longest streak · ${name}` : 'Longest streak'),
    biggestRound: (big: { name: string; game: string } | null) =>
      big ? `Biggest round · ${big.name}, ${big.game}` : 'Biggest round',
    mostPlayed: (count: number | null) => `Most played · ${count != null ? `${count} games` : ''}`,
    dash: '–',
    recent: 'Recent games',
    seeAll: 'See all',
  },

  history: {
    eyebrow: 'History',
    title: 'The record',
    game: 'Game',
    allGames: 'All games',
    winner: 'Winner',
    anyone: 'Anyone',
    count: (n: number, winner: string | null, game: string | null) =>
      `${n} ${plural(n, 'game', 'games')}${winner ? ` won by ${winner}` : ''}${game ? ` of ${game}` : ''}`,
    noMatchTitle: 'Nothing matches',
    noMatchBody: 'Try a different game or winner.',
    emptyTitle: 'No games yet',
    emptyBody: 'Finished games land here.',
  },

  game: {
    subLive: (round: number, goal: string) => `Round ${round} · ${goal}`,
    subDone: (winner: string, rounds: number) => `${winner} won · ${rounds} rounds`,
    scoreRound: (n: number) => `Score round ${n}`,
    blankIsZero: 'Blank counts as 0',
    overTheLine: 'Over the line',
    toGo: (n: number) => `${n} to go`,
    untilBust: (n: number) => `${n} until bust`,
    lastRound: (v: number) => `${signed(v)} last round`,
    noLast: '—',
  },

  // Toasts and banners (prototype unless noted)
  toast: {
    samplesCleared: 'Samples cleared',
    samplesClearedStart: 'Samples cleared. This one counts.',
    tied: 'Tied at the top. One more round decides it.',
    takesLead: (name: string) => `${name} takes the lead`,
    matchPoint: (names: string[]) =>
      `${names.join(' & ')} ${names.length > 1 ? 'are' : 'is'} at match point`,
    /** New: a low-wins player creeping up on the bust line. */
    danger: (names: string[]) =>
      `${names.join(' & ')} ${names.length > 1 ? 'are' : 'is'} in danger`,
    roundSaved: (n: number) => `Round ${n} saved`,
    roundDeleted: (n: number) => `Round ${n} deleted`,
    gameDiscarded: 'Game discarded',
    gameDeleted: 'Game deleted',
    /** New (settings). */
    playerArchived: (name: string) => `${name} archived`,
    playerAdded: (name: string) => `${name} joined`,
    gameRemoved: (name: string) => `${name} removed`,
  },
  banner: {
    start: (name: string) => `${name}!`,
    tiebreak: 'Tiebreak!',
    finalRound: 'Final round!',
    round: (n: number) => `Round ${n}`,
  },

  newGame: {
    title: 'New game',
    what: 'What are we playing?',
    other: 'Other',
    otherPlaceholder: 'Game name',
    lowTag: 'Low',
    howEnd: 'How does it end?',
    goals: { score: 'Score target', rounds: 'Rounds', open: 'Open-ended' },
    goalLabel: 'How the game ends',
    pointsToWin: 'Points to win',
    numberOfRounds: 'Number of rounds',
    bustAt: 'Score that busts',
    scoreHint: 'First past this wins. Highest total takes it.',
    roundsHint: 'Highest total after the last round wins.',
    /** New: low-wins variants of the hints above. */
    scoreHintLow: 'Anyone reaching this busts. Lowest total takes it.',
    roundsHintLow: 'Lowest total after the last round wins.',
    openHint: 'Play as long as you like, then tap the flag to crown the leader.',
    lowWins: 'Lowest score wins',
    lowWinsHint: 'For Hearts, Golf and friends.',
    players: 'Players',
    whoIsPlaying: 'Who is playing',
    addPlaceholder: 'Add a player',
    add: 'Add',
    alreadyPlaying: (n: string) => `${n} is already playing.`,
    nameGame: 'Name the game to start.',
    pickGame: 'Pick a game to start.',
    twoPlayers: 'Add at least two players.',
    setTarget: 'Set a score target, or choose open-ended.',
    setRounds: 'Set a round count, or choose open-ended.',
    dealIn: (name: string) => `Deal in · ${name}`,
    start: 'Start game',
  },

  editRound: {
    title: (n: number) => `Edit round ${n}`,
    hint: 'Blank counts as 0. Totals update as soon as you save.',
    save: (n: number) => `Save round ${n}`,
    del: (n: number) => `Delete round ${n}`,
    armed: 'Tap again to delete',
  },

  endGame: {
    title: (name: string) => `End ${name}?`,
    tied: (names: string[], total: number) =>
      `${names.join(' and ')} are tied at ${total}. Play a tiebreak round, or discard this game.`,
    noRounds: 'No rounds scored yet.',
    leads: (name: string, total: number) => `${name} leads with ${total}`,
    crown: (name: string) => `End and crown ${name}`,
    keepPlaying: 'Keep playing',
    discard: 'Discard this game',
    armed: 'Tap again to discard',
  },

  detail: {
    sub: (date: string, rounds: number, goal: string, sample: boolean) =>
      `${date} · ${rounds} rounds · ${goal}${sample ? ' · sample' : ''}`,
    rematch: 'Rematch',
    del: 'Delete this game',
    armed: 'Tap again to delete',
  },

  settings: {
    title: 'Settings',
    players: 'Players',
    editPlayer: (name: string) => `Edit ${name}`,
    nameOf: (name: string) => `${name}'s name`,
    colourOf: (name: string) => `${name}'s colour`,
    archive: 'Archive player',
    archiveArmed: 'Tap again to archive',
    archiveHint: 'Archived players keep their history but leave the line-up.',
    archived: 'Archived',
    restore: (name: string) => `Bring back ${name}`,
    addPlayer: 'Add a player',
    add: 'Add',
    alreadyHere: (n: string) => `${n} is already here.`,
    games: 'Games',
    editGame: (name: string) => `Edit ${name}`,
    gameName: 'Game name',
    addGame: 'Add a game',
    newGameName: 'New game',
    deleteGame: 'Delete game',
    deleteGameArmed: 'Tap again to delete',
    appearance: 'Appearance',
    theme: 'Theme',
    themes: { system: 'System', dark: 'Dark', light: 'Light' },
    sound: 'Sound',
    soundHint: 'Chimes, fanfares and the sad trombone.',
    soundInSilent: 'Play sounds on silent',
    soundInSilentHint:
      "Ignores the iPhone's Ring/Silent switch. Music from other apps pauses while sounds play.",
    haptics: 'Haptics',
    hapticsHint: 'A little buzz when you score.',
    wakeLock: 'Keep screen awake during games',
    wakeLockHint: 'The phone stays on while a game is on screen.',
    samples: 'Sample games',
    samplesHint: 'Remove the made-up history.',
    clearSamples: 'Clear',
    done: 'Done',
  },

  victory: { rematch: 'Rematch', done: 'Done' },

  sheetLabel: {
    new: 'New game',
    round: (n: number) => `Edit round ${n}`,
    end: 'End game',
    detail: (name: string) => name,
    settings: 'Settings',
  },
} as const

/** "Mon, Oct 12, 2026" (prototype detail sheet). */
export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

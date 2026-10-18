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
    statsTitle: 'By the numbers',
    gamesPlayed: 'Games played',
    longestStreak: 'Longest streak',
    biggestRound: 'Biggest round',
    bigDetail: (name: string, game: string) => `${name}, ${game}`,
    mostPlayed: 'Most played',
    dash: '–',
    recent: 'Recent games',
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
    subDone: (winner: string, rounds: number) =>
      `${winner} won · ${rounds} ${plural(rounds, 'round', 'rounds')}`,
    scoreRound: (n: number) => `Score round ${n}`,
    blankIsZero: 'Blank counts as 0',
    overTheLine: 'Over the line',
    toGo: (n: number) => `${n} to go`,
    untilBust: (n: number) => `${n} until bust`,
    lastRound: (v: number) => `${signed(v)} last round`,
    noLast: '—',
    /** New: "Who won?" games (one winner per round, no points). */
    whoWon: 'Who won?',
    whoWonRound: (n: number) => `Who won round ${n}?`,
    toWin: (n: number) => `${n} to win`,
    winsCount: (n: number) => `${n} ${plural(n, 'win', 'wins')}`,
    wonRound: (name: string, n: number) => `${name} won round ${n}`,
    /** New: tied at the end, before anyone plays the tiebreak round. */
    tieTitle: 'Tied at the top',
    tieBody: "Pick the winner by the game's own tiebreak rule, or play a tiebreak round.",
    crown: (name: string) => `Crown ${name}`,
  },

  // Toasts and banners (prototype unless noted)
  toast: {
    samplesCleared: 'Samples cleared',
    samplesClearedStart: 'Samples cleared. This one counts.',
    tied: 'Tied at the top. Crown the winner, or play one more round.',
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
    gameRemoved: (name: string) => `${name} removed`,
    gameAdded: (name: string) => `${name} added`,
    /** Sync: things that happened on another phone, or a write the family record refused. */
    wonElsewhere: (winner: string, game: string) => `${winner} won ${game}!`,
    endedElsewhere: (game: string) => `${game} was ended on another phone`,
    syncRejected: 'That change came in after the game ended',
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
    /** New: the line under the games until one is picked, then how often it's been played. */
    pickHint: 'Pick a game, or tap Other to name a new one.',
    timesPlayed: (n: number) =>
      n === 0 ? 'New to the record.' : `Played ${n} ${plural(n, 'time', 'times')} so far.`,
    lowTag: 'Low',
    howEnd: 'How does it end?',
    goals: { score: 'Score', rounds: 'Rounds', wins: 'Who won?', open: 'Open' },
    goalLabel: 'How the game ends',
    pointsToWin: 'Points to win',
    numberOfRounds: 'Number of rounds',
    /** New: "Who won?" games and one-round-per-player games. */
    winsNeeded: 'Wins needed',
    winsHint: '1 = one game · 2 = first to two, best of three.',
    winsNote: 'Tap who won each round. No points to add up.',
    perPlayer: 'One round per player',
    perPlayerHint: 'Everyone deals once: the count follows the line-up.',
    bustAt: 'Score that busts',
    scoreHint: 'First past this wins. Highest total takes it.',
    roundsHint: 'Highest total after the last round wins.',
    /** New: low-wins variants of the hints above. */
    scoreHintLow: 'Anyone reaching this busts. Lowest total takes it.',
    roundsHintLow: 'Lowest total after the last round wins.',
    openHint: 'Play as long as you like, then tap the flag to crown the leader.',
    lowWins: 'Lowest score wins',
    lowWinsHint: 'For Hearts, Golf and friends.',
    players: "Who's playing?",
    whoIsPlaying: 'Who is playing',
    addPlaceholder: 'Add a player',
    add: 'Add',
    alreadyPlaying: (n: string) => `${n} is already playing.`,
    nameGame: 'Name the game to start.',
    pickGame: 'Pick a game to start.',
    twoPlayers: 'Add at least two players.',
    setTarget: 'Set a score target, or choose open-ended.',
    setRounds: 'Set a round count, or choose open-ended.',
    setWins: 'Set how many wins it takes, or choose open-ended.',
    dealIn: (name: string) => `Deal in · ${name}`,
    start: 'Start game',
    /** New (sync): someone's game is already on the table. */
    inProgress: (game: string, by: string | null) =>
      `${game} is in progress${by ? ` · started by ${by}` : ''}`,
    resume: 'Resume',
  },

  editRound: {
    title: (n: number) => `Edit round ${n}`,
    hint: 'Blank counts as 0. Totals update as soon as you save.',
    /** New: editing a "Who won?" round. */
    winsHint: 'Tap who won, then save.',
    whoWon: 'Who won this round?',
    save: (n: number) => `Save round ${n}`,
    del: (n: number) => `Delete round ${n}`,
    armed: 'Tap again to delete',
  },

  endGame: {
    title: (name: string) => `End ${name}?`,
    tied: (names: string[], total: number) =>
      `${names.join(' and ')} are tied at ${total}. Crown the winner by the game's own tiebreak rule, play a tiebreak round, or discard this game.`,
    noRounds: 'No rounds scored yet.',
    leads: (name: string, total: number) => `${name} leads with ${total}`,
    crown: (name: string) => `End and crown ${name}`,
    keepPlaying: 'Keep playing',
    discard: 'Discard this game',
    armed: 'Tap again to discard',
  },

  detail: {
    sub: (date: string, rounds: number, goal: string, sample: boolean) =>
      `${date} · ${rounds} ${plural(rounds, 'round', 'rounds')} · ${goal}${sample ? ' · sample' : ''}`,
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
    /** The add-a-game sheet: nothing is saved until "Add game". */
    addGameTitle: 'Add a game',
    addGameSave: 'Add game',
    addGameHint: 'Name it and pick how it ends. Nothing is saved until you add it.',
    nameTaken: (name: string) => `You already have ${name}.`,
    deleteGame: 'Delete game',
    deleteGameArmed: 'Tap again to delete',
    appearance: 'Appearance',
    theme: 'Theme',
    themes: { system: 'System', dark: 'Dark', light: 'Light' },
    sound: 'Sound',
    soundHint: 'Chimes, fanfares and the sad trombone.',
    haptics: 'Haptics',
    hapticsHint: 'A little buzz when you score.',
    wakeLock: 'Keep screen awake during games',
    wakeLockHint: 'The phone stays on while a game is on screen.',
    samples: 'Sample games',
    samplesHint: 'Remove the made-up history.',
    clearSamples: 'Clear',
    /** New: the friendly landing at the top of Settings. */
    hello: 'Hi there!',
    helloBody: 'Keep the score, share the fun, and make it yours below.',
    more: 'More',
    install: 'Install on your phone',
    installHint: 'Works offline, full-screen',
    installedHint: 'Already installed',
    share: 'Share Tally Ho!',
    shareHint: 'Show a QR code',
    contact: 'Say hi to the maker',
    contactHint: 'Blair Metcalf',
  },

  /** New: how to add Tally Ho! to the Home Screen (shown once by itself, and from Settings). */
  install: {
    title: 'Add to Home Screen',
    lede: 'Tally Ho! opens full-screen like an app and keeps score with no signal.',
    hello: 'Keep Tally Ho! one tap away',
    here: 'Or install it on this computer',
    steps: 'How to add it',
    iosShare: 'Tap **Share** in the toolbar',
    iosAdd: 'Scroll down and tap **Add to Home Screen**',
    iosConfirm: 'Tap **Add**, top right',
    iosOtherShare: 'Tap **Share** in the address bar (or its ⋯ menu)',
    iosOtherNote: 'Works in Chrome and Edge on iOS 16.4 or later. Safari is the surest way.',
    androidMenu: 'Tap the **menu** at the top right',
    androidInstall: 'Tap **Install app** or **Add to Home screen**',
    androidConfirm: 'Tap **Install**',
    desktopIcon: 'Click the **install** icon at the end of the address bar',
    desktopConfirm: 'Click **Install**',
    promptBody: 'One tap and it lives on your Home Screen.',
    promptBodyDesktop: 'One click and it opens in its own window.',
    promptButton: 'Install Tally Ho!',
    after: 'Then it opens full-screen and works offline, right from your Home Screen.',
    phoneTitle: "It's made for your phone",
    phoneBody: 'Scan to open it there, then add it to your Home Screen.',
    qrLabel: (url: string) => `QR code to open ${url}`,
    installedTitle: "You're all set",
    installedBody:
      "Tally Ho! is on your Home Screen. Open it from there and it's full-screen, offline and ready for game night.",
    done: 'Got it',
  },

  /** New: share the game with a QR code. */
  share: {
    title: 'Share Tally Ho!',
    lede: 'Point another phone at the code to open Tally Ho! there.',
    qrLabel: (url: string) => `QR code to open ${url}`,
    share: 'Share…',
    copy: 'Copy link',
    copied: 'Link copied',
    copyFailed: "Couldn't copy. Press and hold the link instead.",
    shareTitle: 'Tally Ho!',
    shareText: 'A delightful score counter for family game night.',
  },

  /** New: the maker. */
  contact: {
    title: 'Say hi',
    hello: 'Made by Blair Metcalf',
    body: 'I built Tally Ho! for our family game nights. Say hi, or share an idea for it.',
    visit: 'Visit jblairmetcalf.com',
    url: 'https://jblairmetcalf.com',
  },

  /** New (sync): Settings › Family, the home header chip and badge. */
  family: {
    heading: 'Family',
    demoHint: "You're trying the demo. Sign in to keep the family's scores on every phone.",
    signIn: 'Family sign in',
    resetDemo: 'Reset demo',
    resetDemoHint: 'Fresh sample games, as if you just opened the app.',
    demoChip: 'Demo',
    signedInAs: (name: string) => `Signed in as ${name}`,
    syncedHint: 'Scores sync to every family phone, even after time offline.',
    exportRecord: 'Export family record',
    exportHint: 'Every game, player and preset, as a file you can keep.',
    exported: 'Family record saved',
    signOut: 'Sign out',
    signOutArmed: 'Tap again to sign out',
    signOutFailed: "Couldn't sign out. Try again.",
  },

  /** New (sync): the sign-in sheet. */
  signIn: {
    title: 'Family sign in',
    lede: "The family's scoreboard, on every phone. Use the email and password you were given.",
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    signingIn: 'Signing in…',
    forgot: 'Forgot password?',
    needEmail: 'Enter your email first.',
    needBoth: 'Enter your email and password.',
    resetSent: (email: string) => `Reset link sent to ${email}`,
    welcome: (name: string) => `Welcome, ${name}!`,
    errors: {
      'wrong-credentials': "That email and password don't match.",
      'not-family': 'This scoreboard is just for the family.',
      offline: 'Signing in needs the internet once. After that, Tally Ho! works offline.',
      'too-many-attempts': 'Too many tries. Wait a minute and try again.',
      unknown: "Couldn't sign in. Try again.",
    },
  },

  victory: {
    rematch: 'Rematch',
    done: 'Done',
    /** New: "Who won?" games quote wins, not points. */
    winsSingle: (game: string) => `wins ${game}`,
    winsMatch: (game: string, won: number, next: number) => `wins ${game}, ${won}–${next}`,
  },

  sheetLabel: {
    new: 'New game',
    round: (n: number) => `Edit round ${n}`,
    end: 'End game',
    detail: (name: string) => name,
    settings: 'Settings',
    signin: 'Family sign in',
    install: 'Add to Home Screen',
    share: 'Share Tally Ho!',
    contact: 'Say hi',
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

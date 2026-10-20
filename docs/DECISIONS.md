# Decisions

An architecture decision log: why things are the way they are. Read the relevant entry before reversing or reworking one of these; add a new numbered entry (Context / Decision / Consequences) when you make a choice a future reader would question. Dates are approximate.

| # | Decision | Status |
|---|---|---|
| 1 | Static export + PWA on Vercel, prebuilt | Accepted |
| 2 | Lean monorepo on chief-of-staff's stack | Accepted |
| 3 | Two themes on tokens; `--faint` lifted to AA | Accepted |
| 4 | Local-first `DataProvider` seam | Accepted |
| 5 | Firebase Spark, email + password, console-only allowlist | Accepted |
| 6 | Lazy Firebase SDK, out of the SW precache | Accepted |
| 7 | Rounds as a map keyed by round id | Accepted |
| 8 | Soft deletes; finished games frozen | Accepted |
| 9 | Persisted outbox + mirror | Accepted |
| 10 | iOS audio: `playback` only while sounding | Accepted |
| 11 | Native feel | Accepted |
| 12 | Calm sheets | Accepted (revised by 18) |
| 13 | Default games and how they end | Accepted (revised by 16 and 19) |
| 14 | Demo for signed-out visitors | Accepted |
| 15 | Storybook shape and manager smoke suite | Accepted |
| 16 | How games end: score / rounds / Who won? / open, set from the rulebooks | Accepted |
| 17 | Install guide shows once; share by QR (`uqr`) at the running origin | Accepted (revised by 18, refined by 21) |
| 18 | One sheet, one navigation stack (`SheetNav`) | Accepted |
| 19 | Defaults follow how the family plays | Accepted |
| 20 | The game is a sheet over Home | Accepted |
| 21 | Branded QR codes that still scan | Accepted |
| 22 | Player limits per game, on the preset and synced | Accepted |

## 1. Static export + PWA on Vercel, prebuilt
*2026-10 · Accepted*
- **Context:** A score counter needs no server; it must open instantly and offline from the Home Screen.
- **Decision:** Next.js `output: 'export'` (`apps/web/next.config.ts`), a hand-written service worker (`apps/web/public/sw.js`) with a build-time precache list, deployed with `pnpm deploy` = local build → `scripts/vercel-output.mjs` (Build Output API v3) → `vercel deploy --prebuilt --prod`.
- **Consequences:** What ships is exactly what was tested; Vercel builds nothing. No server routes, no ISR. `sw.js` is served `max-age=0` so installed apps see updates on next open.

## 2. Lean monorepo on chief-of-staff's stack
*2026-10 · Accepted*
- **Context:** Blair's other project (chief-of-staff) already proved a stack; reusing it keeps the portfolio coherent and the cognitive load low.
- **Decision:** A pnpm-workspace with turbo, TypeScript source packages (`core` → `ui` → `app`) with no build step, Biome, Vitest, Playwright, Tailwind v4, Storybook 8, Zod, zustand.
- **Consequences:** Clear layering (no React in core, no store in ui, no `next/*` outside `apps/web`). New dependencies need a stated reason.

## 3. Two themes on tokens; `--faint` lifted to AA
*2026-10 · Accepted*
- **Context:** The prototype is dark only, and its `--faint` (`#6a64a0`) fails AA on its surfaces.
- **Decision:** Semantic tokens in `packages/ui/src/styles/tokens.css` with Dark (prototype ink) and Daylight (cream). `--faint` lifted to `#8d86be` in dark (4.5:1 on `--surface`); the old colour lives on as `--faint-deco`, for placeholders only. Small coloured text uses `-text` tokens.
- **Consequences:** No raw colours in components. Every story is axe-checked in both themes.

## 4. Local-first `DataProvider` seam
*2026-10 · Accepted*
- **Context:** The app started as localStorage-only but needed room for sync without rewriting screens.
- **Decision:** All persistence goes through `DataProvider` (`packages/app/src/provider.ts`: `load` / `save` / `subscribe`). The store saves every data change and reacts to remote changes via `replaceData`.
- **Consequences:** Demo (`localProvider`) and family (`cloudProvider`) are interchangeable; stories and tests use `memoryProvider`. `load()` must be synchronous, which is why family mode keeps a mirror.

## 5. Firebase Spark, email + password, console-only allowlist
*2026-10 · Accepted*
- **Context:** Three family members need a shared live scoreboard; nobody else may read it; nothing may ever bill.
- **Decision:** Firebase Auth + Firestore on the free Spark plan (no billing account). Email + password, sign-up disabled in the console. Not Google sign-in: auth redirects/popups are fragile in an installed iOS PWA. Membership is a `members/{lowercase email}` doc that only the console can write; `firestore.rules` checks it on every access.
- **Consequences:** Over quota, Firestore stops for the day rather than charging. No server code. Adding a person is a console task (see README).

## 6. Lazy Firebase SDK, out of the SW precache
*2026-10 · Accepted*
- **Context:** Most visitors are portfolio visitors in demo mode; the Firebase SDK is large.
- **Decision:** `packages/app/src/sync/firebase.ts` loads Firebase with dynamic `import()` only in family mode. `scripts/sw-precache.mjs` detects Firebase chunks and leaves them out of the install-time precache; the cache-first rule keeps them after a member's first online sign-in.
- **Consequences:** Demo first paint never pulls Firebase. A brand-new family phone must open once online after signing in.

## 7. Rounds as a map keyed by round id
*2026-10 · Accepted*
- **Context:** Two phones may score the same game at once, offline.
- **Decision:** `games/{id}.rounds` is a map `roundId → { scores, at, by? }`. A new round is a single field write `rounds.<id>`; `diff()` emits field-level ops. Old rounds get ids `<gameId>-r<n>` (`withRoundIds`).
- **Consequences:** Concurrent rounds merge instead of overwriting. Order comes from `at`, then id. Rules can't validate each round's inner shape (they cap the count); the client does.

## 8. Soft deletes; finished games frozen
*2026-10 · Accepted*
- **Context:** Data loss is the worst failure (GOALS #1), and an offline phone can send stale writes.
- **Decision:** Games are never hard-deleted (`deletedAt`); players are archived, never deleted; presets may be deleted. The rules freeze a game whose stored `completedAt` is set: only `deletedAt`/`updatedAt` may change.
- **Consequences:** A late round for a game won elsewhere is refused; the phone toasts `COPY.toast.syncRejected` and rolls back. Undo of a delete stays possible.

## 9. Persisted outbox + mirror
*2026-10 · Accepted*
- **Context:** Firestore's offline queue only exists once the SDK has loaded; an app killed during that window would lose writes, and first paint can't wait for IndexedDB.
- **Decision:** Every family write is recorded in `tallyho.outbox` (`sync/outbox.ts`) before it's sent and removed only when settled; replayed next launch. The last known family `Store` is mirrored in `tallyho.family` for a synchronous first paint.
- **Consequences:** Writes must be idempotent (set-merge, field updates, soft deletes) with timestamps resolved at enqueue time. Snapshots missing an unconfirmed write don't revert it. Sign-out clears both keys.

## 10. iOS audio: `playback` only while sounding
*2026-10 · Accepted*
- **Context:** The family's iPhones live on silent. Attempts: (a) default audio session → silent with the Ring/Silent switch on; (b) `navigator.audioSession.type = 'playback'` always → sounds play, but other apps' music stops and audio cut in and out; (c) `'ambient'` → mixes with music but is silent on silent. iOS forces an either/or between ignoring the silent switch and mixing with music.
- **Decision:** `SFX` (`packages/ui/src/feel/sfx.ts`) claims `playback` only from a tap that plays a sound (the context is created inside that gesture), and releases it (closes the context, session back to `auto`) after 6 s idle, on hide/`pagehide` (`SFX.sleep`) and on mute. The header sound button is the only toggle; no "sound on silent" setting (the short-lived `soundInSilent` pref is dropped by `migrate`).
- **Consequences:** Music elsewhere pauses while Tally Ho! sounds and can resume after. Guarded by the sound test in `e2e/pwa.spec.ts`. See [LESSONS.md](LESSONS.md).

## 11. Native feel
*2026-10 · Accepted*
- **Context:** In an installed PWA, accidental text selection, long-press callouts and the double-tap delay make it feel like a web page.
- **Decision:** `user-select: none`, `-webkit-touch-callout: none`, no tap highlight on `.tally`; `touch-action: manipulation` on every element; inputs and `.selectable` opt back in (`packages/ui/src/styles/components.css`).
- **Consequences:** Any new text that users must copy needs `.selectable`. Checked by `e2e/pwa.spec.ts`.

## 12. Calm sheets
*2026-10 · Accepted, revised by 18*
- **Context:** Long sheets scrolled their title and main button away, and controls appearing on selection made sheets jump under the thumb.
- **Decision:** Sticky `.sheet-title` with close, `.sheet-cta` pinned at the bottom, editors as nested sheets (since 18: pages pushed in one sheet), and skeletons in fixed slots instead of progressive-disclosure jumps.
- **Consequences:** New sheets use `SheetTitle` and `.sheet-cta`; layouts reserve their final height. See [DESIGN.md](DESIGN.md#sheets).

## 13. Default games and how they end
*2026-10 · Accepted, revised by 16 and 19*
- **Context:** The family's shelf has games that end in different ways; the app counts, it doesn't enforce rules.
- **Decision:** Four goals, each preset set from its rulebook (the research is in 16): race to a score (`score`), fixed rounds (`rounds`, optionally `roundsPerPlayer`), "Who won?" (`wins`: tap the round's winner, first to `target` wins) and open-ended (`open`, crowned with the flag); `score` and `rounds` can be lowest-wins. `DEFAULT_PRESETS` (`packages/core/src/presets.ts`): Uno is now "Who won?" (the 2022 official rules: first to empty their hand wins; 500 points is an optional variant), Jaipur is first to 2 Seals, The Fox in the Forest stays a race to 21 (its rulebook's standard game; 16 and 35 are variants), Scout is one round per player, Push is one final tally. *(Superseded by 19: Fox, Scout and Mille Bornes now default to Who won?)* Games won outright (Schotten Totten, Monopoly Deal…) moved from open-ended to "Who won?".
- **Consequences:** A tie at the end offers two ways out: pick the winner by the game's own tiebreak (`crownWinner`, one of the tied leaders) or play a tiebreak round. Preset names must be unique (React keys); Settings adds "New game", "New game 2"… Defaults only seed new stores: an already-seeded family keeps its presets until someone edits them.

## 14. Demo for signed-out visitors
*2026-10 · Accepted*
- **Context:** Portfolio visitors must see a lived-in app without an account, and must never see family data.
- **Decision:** Signed out (or a build without Firebase config) is demo mode: `localProvider` with deterministic sample games (`freshStore`), which clear when the first real game starts. Sign-out wipes family data from the phone and resets the demo to fresh samples; Settings has "Reset demo".
- **Consequences:** The family's first sign-in seeds default players and presets, never samples. Samples never sync.

## 15. Storybook shape and manager smoke suite
*2026-10 · Accepted*
- **Context:** Storybook is a portfolio surface and the design-system review tool.
- **Decision:** `tags: ['autodocs']` gives every component a Docs page; full-screen stories opt out with `!autodocs`. Sidebar roots start collapsed and the addon panel is hidden (`bottomPanelHeight: 0`) in `apps/storybook/.storybook/manager.ts`. Every story renders in both themes. `e2e/storybook-manager.spec.ts` opens every entry inside the real manager UI.
- **Consequences:** A control/args mismatch that crashes the manager fails CI, not just a visitor's browser.

## 16. How games end: score / rounds / Who won? / open, set from the rulebooks
*2026-10 · Accepted*
- **Context:** The first defaults (13) guessed: many games that are won outright were "open-ended" (so the app crowned whoever had typed the most points), Uno was a race to 500, and Scout's 3 rounds were only right for three players. Researched against each game's official rulebook (current edition), most defaults were wrong in a way that crowned the wrong person or never ended.
- **Decision:** A new goal, `wins` ("Who won?"): each round has one winner, stored as an ordinary round scored `{ winner: 1, others: 0 }` (`winRound`, `submitWinner`), so totals are win counts and `evaluate()` ends the game at `target` wins (1 = a single game; labelled "Who won?", N = "First to N wins"). Presets gain an optional `roundsPerPlayer` (`targetFor` deals one round per player). `rounds` with target 1 is a single final tally ("Final scores"). Every default follows its rulebook:

  | Game | Rulebook ending | Mode |
  |---|---|---|
  | Monopoly Deal | First to lay down 3 complete property sets of different colours wins | Who won? (`wins` 1) |
  | High Society | When the game ends, the player with the least money is out; highest status among the rest wins (top score needn't win) | Who won? (`wins` 1) |
  | Spicy | First to 2 trophy cards wins (or the most points if the deck runs out) | Who won? (`wins` 1) |
  | Uno | 2022 official rules: first to play all their cards wins; scoring to 500 is optional | Who won? (`wins` 1) |
  | Schotten Totten | Claim 5 stones, or 3 adjacent stones | Who won? (`wins` 1) |
  | Bananagrams | First to use all their tiles once the bunch is empty calls "Bananas!" and wins | Who won? (`wins` 1) |
  | Jaipur | Best of three rounds: first to 2 Seals of Excellence | First to 2 wins (`wins` 2) |
  | Mille Bornes | Hands until a player reaches 5,000 points | Who won? (`wins`, 1): family choice (19); was a race to 1,000 |
  | The Fox in the Forest | Rounds until someone reaches 21 points (16 and 35 are variants) | Who won? (`wins`, 1): family choice (19); the rulebook race to 21 is one switch away |
  | Flip 7 | First to 200 points at the end of a round | Race to 200 (`score`) |
  | Bocce | Frames until a side reaches 12 points (13 or 16 in some leagues) | Race to 10 (`score`): family choice |
  | Sushi Go | 3 rounds, puddings scored at the end | 3 rounds (`rounds`) |
  | Scout | As many rounds as players, each dealing once | Who won? (`wins`, 1): family choice (19); one round per player stays available |
  | Push | One game, banked cards counted when the deck runs out | Final scores (`rounds` 1) |

- **Consequences:** `goal` and `roundsPerPlayer` are synced: `firestore.rules` accepts `'wins'` (with an int `target`) and an optional `roundsPerPlayer` bool, in `hasOnly` so older clients' documents stay valid; rules must deploy before the app that writes them. An older app version reading a `wins` game or preset drops it as unreadable (its Zod enum lacks `'wins'`) rather than mis-scoring it. Ties offer "pick the winner by the game's tiebreak" or a tiebreak round (13). Adding a game follows the same research: skill `add-game`. In the UI the four choices read Score / Rounds / Who won? / **Open** (not "Open-ended": four segments must fit one row at 320px; the goal still reads "Open-ended" everywhere else), and every goal keeps its own target so switching never turns 200 points into 200 rounds.

## 17. Install guide shows once; share by QR (`uqr`) at the running origin
*2026-10 · Accepted, revised by 18, refined by 21*
- **Context:** Tally Ho! is only offline and full-screen once it's on the Home Screen, and iOS never offers to install a web app: people have to find Share › Add to Home Screen themselves. Visitors also want to pass it to another phone, and say hi to the maker.
- **Decision:** An install guide (`packages/app/src/sheets/InstallSheet.tsx`, `InstallGuide`) per platform from `useInstall()` (`packages/app/src/install.ts`): iPhone Safari's Share steps, other iOS browsers (same steps, a nudge to Safari), Chromium's captured `beforeinstallprompt` as one big button (or the menu's steps), and on a computer a QR code to open it on the phone; installed → "You're all set". It pops up **once**, silently, 1.2 s after the first paint in a browser tab, only on Home with nothing else open (not standalone, not `embedded`/Storybook); however it's dismissed sets `prefs.installHintSeen`, so it never pops up by itself again. If the phone is busy at that moment it waits for the next launch. Settings opens with a landing (fox + three `LinkRow`s) for the guide, Share (QR + address + Share… + Copy link) and the maker (a link to jblairmetcalf.com; no email), each a nested sheet (since 18: a pushed page). QR codes come from **`uqr`** (MIT, zero dependencies, ~10 KB min) at error correction H with our own SVG (`QrCode`: ink on a white plate in both themes, fox badge ≤ 20% of the width), loaded with a dynamic `import()` so it's never in the first-paint chunks. The shared address is `location.origin + '/'`: the Vercel URL once deployed, nothing hard-coded.
- **Consequences:** `installHintSeen` is a device-local pref like the rest (prefs never sync: `cloudProvider` keeps `current.prefs`), so no Firestore rules change; old saved prefs parse with the `false` default. The pop-up opens without the `open` sound (`openSheet(spec, true)`): a sound outside a tap would claim iOS's `playback` session and pause the person's music (10). e2e seeds `installHintSeen: true` in `household()`/`withSamples()`; specs that boot without a seed (the cloud suite) must do the same or dismiss it. A missed `beforeinstallprompt` (fired before the app chunk loads) only means the manual steps show instead of the button.

## 18. One sheet, one navigation stack (SheetNav) instead of stacked sheets
*2026-10 · Accepted, revises 12 and 17*
- **Context:** Settings grew three layers of real sheets (Settings › Players › Edit Kate), each with its own backdrop, a little shorter than the one beneath, and a close button that closed only itself. Getting out meant peeling layer by layer, the close buttons all looked alike but did different things, and three backdrops and three focus traps made the stack feel heavy on a phone. The family asked for a quick way out.
- **Decision:** One `Sheet` per thing opened; going deeper pushes a page inside it with `SheetNav` (`packages/ui/src/primitives/SheetNav.tsx`, used as `<Sheet nav>`). One header that never scrolls: back (chevron, "Back") top left on any page past the root, the page title, and Close always top right, closing everything. Pages push from the right with the page beneath stepping left, like iOS navigation; back reverses it. The page title is the Radix `Dialog.Title`, so the dialog's accessible name follows the page ("Settings", "Players", "Edit Kate", "Family sign in"). Escape goes back a page, and closes at the root; the grab handle and backdrop close the whole sheet. Settings is a router over a `Route[]` stack in `SettingsSheet`; push plays `open`, back plays `close`, archive/delete/add pop silently after their own cue. The slide uses a new `--glide` curve (cubic-bezier(.32,.72,0,1)) rather than `--spring`: a spring's overshoot on a full-width page would open a gap at the sheet's edge. Not in the prototype (it had no nested pages); this is a native-feel deviation.
- **Consequences:** Nothing nests sheets any more, so the Sheet's nesting support (`SheetDepth`, `.nested`, `data-depth`, `tall`) is gone; a sheet that needs pages uses `SheetNav`. Pages beneath stay mounted (inert, `aria-hidden`), so their scroll and drafts survive a round trip; a page whose player or game disappears (archived on another phone) drops out of the stack. e2e selects the dialog by the page title (`getByRole('dialog', { name: 'Edit Kate' })`), and `getByRole('dialog', { name: 'Settings' })` matches only on the landing.


## 19. Defaults follow how the family plays, not only the rulebook
*2026-10 · Accepted*
- **Context:** The defaults were set from the rulebooks (16). The family plays several of them simply to a winner.
- **Decision:** The Fox in the Forest (rulebook: race to 21), Scout (one round per player) and Mille Bornes (race to 5,000; we had 1,000) default to **Who won?** (`wins`, 1), alongside Monopoly Deal, High Society and Spicy, which already were. The rulebook modes stay one tap away in New game and Settings › Games.
- **Consequences:** No default uses one round per player any more; the feature stays (tests use a "Round Robin" test preset). The demo's sample history keeps its scored games (history can predate a preference, and real totals give the demo stats something to show). Defaults only seed new records: an existing demo or family record picks them up with Settings › Games › Restore default games (built-in ids only; the family's own games stay). A drift audit should treat these as family choices, not rulebook errors.

## 20. The game is a sheet over Home
*2026-10 · Accepted (deviates from the prototype, where the game was a screen)*
- **Context:** Starting a game swapped Home for a full game screen with its own back button, and Resume switched screens the same way. The family wanted the game to feel like the other sheets: rise over Home, and put away with a swipe.
- **Decision:** The game is a sheet (`{ type: 'game' }` in `SheetSpec`, rendered by `GameSheet` with `SheetNav`): the scoreboard is the root page, titled with the game's name; Edit round and End game are pages pushed inside it (`gamePage`, `gameBack`), never sheets of their own. Dealing in from New game closes that sheet first and raises the game once it's gone (`GAME_AFTER_MS` = 300, after Sheet's 290ms close); Resume (Home's card, the nav fox, New game's notice) does the same. Close, a drag or Escape at the scoreboard puts the game away with it still live. A game in progress at launch opens straight into its sheet. When a game is won, the sheet slides away as the victory overlay rises (the 500ms mark), because an open sheet is modal and would hold the overlay's Rematch and Done out of reach; Rematch raises a fresh game sheet.
- **Consequences:** `Screen` is just the tabs (`home`, `history`); "watching the game" means the game sheet is open. Home stays rendered under the sheet, so e2e scopes game text to the dialog (`gameSheet()` in `e2e/helpers.ts`), and fields on pushed pages are found by role (the page beneath stays mounted, inert). The banner after dealing in waits for the sheet (300 + 250ms). Toasts in a game sit at the bottom, as before.

## 21. Branded QR codes that still scan
*2026-10 · Accepted (refines 17)*
- **Context:** The share and install QR codes were plain ink squares on white: scannable, but off-brand next to everything else.
- **Decision:** `QrCode` draws ink dots (radius 0.43 module) on a cream plate in the icon's jade ring, the three finder "eyes" as rounded squares in deep jade with a deep-fox centre, and the fox badge in the middle (error correction H). Colours are the `--qr-*` tokens, the same in both themes: always dark on light, and the eyes use the deep tones (not the bright jade/fox) so they still read as dark to a camera.
- **Consequences:** Checked with macOS's own QR reader (Core Image `CIDetector`, via `osascript -l JavaScript`) on Storybook screenshots: both themes decode at full, half and 30% size. Any change to the treatment repeats that check (see LESSONS). `QrCode.test.ts` proves the dots plus the drawn eyes are exactly the encoder's modules.

## 22. Player limits per game, on the preset and synced
*2026-10 · Accepted (first shipped as a code-only table; revised the same week so the family can edit limits)*
- **Context:** Some games only work with certain numbers: The Fox in the Forest is a two-player game, and the family plays High Society with three or more (the box says 3–5). New game let any line-up of two or more deal in, the demo's samples played the Fox three-handed, and Settings › Games didn't show or edit a game's player count.
- **Decision:** Presets carry optional `minPlayers` (2–12) and `maxPlayers` (2–12, or `null` = no limit), synced like the other preset fields. `playerRangeOf(preset)` (`packages/core/src/lineup.ts`) reads them field by field, falling back to the built-in default with the same id, then to 2 or more; `rangeForGame(presets, name)` finds a game by its preset name or slug (so a game typed into Other as "The Fox in the Forest" counts), else a built-in. Defaults: the Fox 2–2, High Society 3+. Settings › Games (edit and Add a game) has Fewest / Most players fields (blank Most = no limit; clamped 2–12, Most never below Fewest) and the Games list shows "· 2 players". New game states the limit and keeps Deal in disabled with the reason until the line-up fits; `startGame` refuses a line-up that doesn't fit. Sample Fox games seat a rotating pair.
- **Consequences:** A synced field: `firestore.rules` accepts the two optional keys (`playerLimits()`), so **rules deploy before the app** (old rules refuse a preset write that carries them, e.g. Restore default games or editing a limit). Old app versions never send the keys and keep validating; old docs without them fall back to the built-in defaults, so an existing family record knows the Fox is for two without Restore default games. The editor always writes explicit values, so "no limit" (`null`) sticks instead of falling back. Changing the sample line-ups changed the demo's sample history (same seed).

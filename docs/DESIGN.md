# Design

The design language: tokens, type, shape, motion, sound, haptics, native feel, sheets, components and copy. Read this before building or restyling any UI.

The reference is the original prototype, `docs/imports/Tally Ho!.html` (open it in a browser); the Sticker Club comes from `docs/imports/Tally Ho Sticker Club.html` (decision 24). Port its look, timings, sounds and copy faithfully; deviate only where listed under [Deliberate deviations](#deliberate-deviations).

## Tokens

All colour comes from `packages/ui/src/styles/tokens.css`. Components use `var(--token)` in `components.css`, or one of the few Tailwind utilities mapped onto tokens in `tokens.css`'s `@theme` block (`bg-sunk`, `bg-surface`, `border-line`, `text-muted`, `text-faint`, `text-jade-text`, `border-jade`; add a mapping when a component needs a new one), never raw hex. Brand art (`Fox`, the icon, `PLAYER_COLORS`) is the exception, plus `THEME_COLOR` (the `theme-color` meta tag can't read a variable). Where Daylight differs (an ink edge on bright text, the toast flipping to ink, the sheet on `--page`), that difference is a token defined in both theme blocks (`--edge-1`, `--toast-bg`, `--sheet-surface`…), never a `[data-theme="light"]` rule in `components.css`. Neutral shadows may use `rgb(0 0 0 / a)` inside a token; `motion.css` keyframes keep the prototype's literals.

| Theme | `data-theme` | Character |
|---|---|---|
| Dark (default) | `dark` | The prototype's ink world, matched to the app icon (`--page: #13112e`) |
| Daylight | `light` | Cream card-table paper (`--page: #fff4e2`), same jewel accents |

The user picks Dark, Daylight or System in Settings (`prefs.theme`). `ThemeRoot` (`packages/ui/src/theme/ThemeRoot.tsx`) scopes tokens; the boot script in `apps/web/app/layout.tsx` sets the theme before first paint.

| Group | Tokens | Use |
|---|---|---|
| Surfaces | `--page`, `--sunk`, `--surface`, `--surface-hi`, `--line` | Page, sheets, cards, raised cards, borders |
| Text | `--text`, `--muted`, `--faint` | Body, secondary, tertiary (all AA on `--surface`) |
| Decorative | `--faint-deco` | Placeholders only: meant to recede, exempt from contrast |
| Accents | `--jade`, `--amber`, `--fox`, `--coral`, `--lav`, `--cream` (+ `-deep` pressed edge; `--jade-rgb`, `--amber-rgb`, `--lav-rgb` for alpha) | Fills, buttons, glows |
| Small coloured text | `--jade-text`, `--amber-text`, `--coral-text` | Any coloured text under ~18px. In Daylight these are darker shades so they pass AA; fills keep the plain token |
| On accent | `--on-accent`, `--ink` | Text on jewel fills |
| Tab bar | `--bar-bg`, `--bar-line`, `--bar-ink`, `--bar-on` | The bottom tabs wear the **opposite theme** so they stand out from the page: a cream bar on Dark, an ink bar on Daylight (each the other theme's surface, muted/faint and jade text, so the AA pairs carry over). The fox button keeps its page-coloured halo The selected tab's icon fills in (`homeFill`, `scrollFill`) with a pop. |
| Stickers | `--die` | The die-cut border and the shine under a sticker (white-ish in both themes); glyphs are `--on-accent` ink |
| Launch screen | `--splash-bg` | The splash art's own ground (#0c102b, the same in both themes: it's brand art, like the icon) |
| Fox Trot | `--note-ring`, `--playhead-glow` | A staff note's edge (the surface in Dark; an ink edge in Daylight, so amber, jade and cream notes hold 3:1 on white) and the playhead's amber glow (a solid deep-amber ring in Daylight) |
| Players | `--p0`…`--p7` | The prototype's eight chip colours. Players store a palette index; use `paletteVar(i)` (`packages/ui/src/brand/palette.ts`). `PLAYER_COLORS` is only for canvas/SVG |

## Type

| Role | Font | Token |
|---|---|---|
| Display (titles, big numbers, victory) | Lilita One | `--f-display` |
| Body | Nunito 600–900 | `--f-body` |

Fonts load via `next/font` in `apps/web/app/layout.tsx`. Numbers use `.num` (tabular figures).

## Shape and the 3-D press

- Radii: `--r` 16 (cards), `--r-sm` 12, `--r-btn` 14, `--r-nav` 22, `--r-sheet` 26.
- Buttons sit on a solid drop edge: `box-shadow: 0 4px 0 var(--jade-deep)` (or `--amber-deep`, `--line` for ghost). On `:active` the button moves down and the edge shrinks to `0 1px 0`, so it feels physically pressed. Keep this on any new pressable surface (`.btn`, `.icon-btn` in `components.css`).
- Cards use a soft drop (`0 3px 0 var(--drop-soft)`); display type gets `--display-shadow`.

## Motion

- Keyframes live in `packages/ui/src/styles/motion.css`, all shown on Foundations › Motion: every prototype keyframe verbatim, the Sticker Club's `foil`, and our own (`themeReveal`, `navInPush`…) (`rise`, `pop`, `crownDrop`, `bump`, `deltaUp`, `ribbon`, `sheetIn`, `toastIn`, `matchGlow`…) plus `dangerGlow` for lowest-wins games. Add new ones there.
- The spring curve is `--spring: cubic-bezier(0.25, 1.45, 0.45, 1)`.
- **Segmented controls** slide: the raised background is one thumb (`.seg-thumb`) that springs to the chosen segment on `--spring`, measured from the button (columns may differ in width), inside a clipped track so the overshoot never leaves the well.
- **The launch screen** (`Splash`, decision 28): the fox with its cards (`splash-art.webp`, cut from `docs/imports/splash-screen.png` by `pnpm icons`) on `--splash-bg`, min(88vw, 386px) wide with its middle 44% down, exactly where the iOS launch images put it, so launch image → splash → app never jumps. The art `wobble`s once (it starts and ends still), the tagline `rise`s, a jade bar `grow`s, "Loading…" fades in; it leaves with `fadeOut` once the app is up but never before the page is two seconds old. Rendered into the static page, so it paints before any script; the same in both themes.
- **The Fox Trot** (decisions 27, 29; the coda that tells how the game was won is decision 29, tuned on Foundations › Fox Trot Lab): a game's song drawn as a `Staff` (five faint `--text` lines and **every note of the song placed by time and pitch**: the riff as hollow ink rings, each round in its singer's palette colour, the bass small and faint underneath, the coda in the winner's colours; each note lights up with a `pop` and the amber glow while it sounds, frame by frame; a song card's mini staff shows the melody as flat dots). A new round's beat drops in with `letterDrop` (only rounds scored while the sheet is open); the playhead `pop`s each note with an amber glow; an edited round is tinted amber. `SongStrip` makes the staff one tappable strip with a jade play glyph (amber stop) for the game sheet (`compact`: a 56px staff, "The song so far" and its caption only before the first round, so the score entry stays above the fold), Edit round (Hear it), the victory overlay (bare, a 56px staff) and game details. `SongCard` (150 wide: cover in the winner's colour, the game in the display face, a record that `spin`s while it plays, a mini staff, winner · date · rounds, a 44px play/stop) fills the `MixtapeShelf` on Home, edge to edge; a game finished since Home opened is pressed onto it (`rise` + `pop`) once the victory overlay has gone. No new keyframes.
- **The victory sticker pack** sits in `VictoryOverlay`'s children slot (between the name and the podium); with a pack the badge shrinks so it stays one screen on most phones, and the overlay scrolls from the top (`safe center`) when it can't.
- **A view transition (the theme reveal) isn't a backdrop tap:** while one runs its overlay takes every tap, so `Sheet` ignores outside interactions on `<html>` or during `.theme-reveal` (LESSONS).
- **Stickers** (decision 24) are die-cut: a coloured shape (circle, burst, hex, rounded square) with a `--die` border and a soft shadow, the glyph in ink (`--on-accent`, AA on every fill), never quite straight (`tilt`). Locked ones are a dashed `--faint` outline of the same shape. They move in the app's own vocabulary, not the Sticker Club's (decision 26): they `rise` onto the sticker book (staggered), `pop` out of the victory pack (with the `sticker` sound a note higher each time), and the pack rises with the podium, then nudges with the podium winner's `wobble` to invite the tap, its foil shining (`foil`). Their only tilt is the sticker's own static one. Standings rows open sticker books, said under the heading ("Tap a name for their stickers"); a row's spoken name keeps its place and wins. A sticker inside a named control has no label of its own (decorative).
- **Changing the theme** (Settings › Appearance) reveals the next one as a circle growing from the tapped segment (`revealFrom` in `packages/ui/src/feel/reveal.ts`, `themeReveal` in `motion.css`, 0.7 s ease-in-out). It's a View Transition: the old page is a still snapshot, the new one is clipped to the circle, and the theme switches synchronously inside it (`flushSync`). From the keyboard it grows from the focused segment. Without View Transitions (older browsers) or under reduced motion it switches instantly.
- A page pushed inside a sheet glides on `--glide: cubic-bezier(0.32, 0.72, 0, 1)` (no overshoot, so no gap opens at the sheet's edge; [decision 18](DECISIONS.md)).
- **Reduced motion:** the `prefers-reduced-motion: reduce` block at the bottom of `motion.css` is the single kill switch (durations → 0.001ms). Never bypass it with JS timing; confetti (`FX`) skips itself.
- Motion must never delay input: the next tap is always available.

## Sound

A Web Audio synth with no audio files: `SFX` in `packages/ui/src/feel/sfx.ts` (the prototype's 8-bit cues, verbatim). The store plays cues through `effects.play(cue)`; cues with a matching haptic also buzz.

| Cue | When |
|---|---|
| `tap` | Key press, nav tap, small toggles |
| `pick` | Choosing a pill, resuming, a win reported from another phone |
| `open` / `close` | A sheet slides up / away |
| `deal` | New game opens: the Tally Ho! tune (about a second; decision 23) |
| `sticker` / `rip` | A sticker lands: `pick`'s blip over a triangle thump, each in a run a step higher / the victory sticker pack tears open: a fast zip up and a sparkle |
| `add` / `remove` | A player joins / leaves the line-up |
| `start` | Deal in: a new game |
| `submit` | A round is saved from Edit round, a game is finished from End game |
| `note` | A round is scored: that round's note in the game's Fox Trot song (`roundNotes`), in place of `submit` (decision 27); buzzes like `submit` |
| (Fox Trot) | Not cues: songs play through `SFX.song(notes)` on one stoppable bus. Parts at the cues' own levels, no compressor: `lead`/`riff`/`lick`/`story` square, `bass`/`harmony`/`chord`/`answer`/`seal` triangle (the story is `win`'s two voices, the chord rolls like `start`, the seal is `deal`'s sparkle); each note's `v` scales it (decision 29). Hear them on Foundations › Fox Trot Lab |
| `lead` | Someone takes the lead |
| `match` | Someone reaches match point (within 15% of the target) |
| `tie` | Tied at the end: tiebreak |
| `error` | A refused action; arming a `ConfirmButton` |
| `del` | Something is deleted |
| `win` | The fanfare (victory) |
| `lose` | The losers' sting, 2.3 s after the fanfare (`VictoryOverlay`) |

iOS rules (why it's built this way: [DECISIONS.md](DECISIONS.md#10-ios-audio-playback-only-while-sounding), [LESSONS.md](LESSONS.md)): a sound creates its own audio context inside the tap that plays it; `playback` session is held only while sounding and released after 6 s idle, on hide (`SFX.sleep`) and on mute. The header speaker button is the only sound toggle (`prefs.muted`).

## Haptics

`Haptics` (`packages/ui/src/feel/haptics.ts`): named patterns (`tap`, `pick`, `submit`, `add`, `deal`, `sticker`, `rip`, `lead`, `match`, `error`, `del`, `win`). Vibration API on Android; on iOS 18+ a hidden `<input type="checkbox" switch>` click plays the system tick, one per pulse. `effects.ts` buzzes on `submit`, `note`, `deal`, `sticker`, `rip`, `win`, `lead`, `match`, `error`, `del`. Off when `prefs.haptics` is false.

## Confetti

`FX` (`packages/ui/src/feel/confetti.ts`) draws suit-shaped confetti on one shared canvas (`<FxCanvas/>`). Bursts come from the pressed element (`effects.burstFrom`) and the victory cannon. Skips under reduced motion.

## Native feel

The app should feel like an iOS app, not a web page. Base rules are in the top of `packages/ui/src/styles/components.css` (and `apps/web/app/globals.css` for the page):

- `.tally` sets `user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`.
- `touch-action: manipulation` on **every** element (`:where(.tally) *`), because it doesn't inherit; this removes the double-tap-zoom tap delay. Elements needing more (the sheet's grab handle) set their own.
- **The window never zooms** (decision 28): the viewport meta has `maximum-scale=1, user-scalable=no`; the page is `touch-action: pan-x pan-y` (`globals.css`), which every element's `manipulation` intersects with, so pinch and double-tap zoom are off everywhere; iOS Safari ignores both for pinch, so the layout's `NO_ZOOM` script cancels its `gesturestart/change/end` events, and a trackpad pinch (ctrl + wheel) too.
- Images, SVGs and links can't be dragged.
- Inputs, textareas, `contenteditable` and `.selectable` opt back in to selection and callouts.
- Base element resets are wrapped in `:where()` so component classes always win.
- Guarded by the "feels native" test in `e2e/pwa.spec.ts`.

## Sheets

`Sheet` and `SheetTitle` (`packages/ui/src/primitives/Sheet.tsx`, Radix Dialog underneath).

- `.sheet-title` (title + close button) is sticky at the top while the sheet scrolls.
- `.sheet-cta` pins the sheet's main action to the bottom, always one tap away; its label stays on one line.
- **A main action that can't run yet is disabled, never a tap that fails.** The line above it says why (New game: "Pick a game to start.", "Add at least two players.", "…is for exactly 2 players.", a missing target), linked with `aria-describedby`, and keeps its space when empty so the button doesn't jump. Errors from other controls ("Kate is already playing.") still shake in as an alert.
- **One sheet, one navigation stack.** Somewhere deeper to go inside a sheet (Settings › Players › Edit Kate) is a page pushed with `SheetNav` (`packages/ui/src/primitives/SheetNav.tsx`) inside `<Sheet nav>`, never a sheet on top of a sheet. Its header never scrolls away: a back chevron top left on any page past the root, the page's title (also the dialog's accessible name), and close **always top right**, closing the whole sheet. Pushing slides the new page in from the right while the one beneath steps 30% left (`navInPush` / `navOutPush`, 0.42 s on `--glide`, no overshoot); back plays it in reverse; reduced motion swaps instantly. Each page scrolls on its own and stays mounted (inert, hidden) while it's beneath, so its scroll and state are there on the way back. Focus goes to the new page's title on a push and back to the control that pushed on a pop. Escape goes back a page (closes at the root); a drag on the handle or a backdrop tap closes the sheet. A nav sheet stands at full height (`<Sheet nav>` adds `.paged`), and a page's `.sheet-cta` sits at its bottom. Content that needs Escape for itself claims it through the `SheetEscape` context in `Sheet.tsx`, never its own key listener.
- Single-page sheets (New game, the install pop-up, the sticker book from Standings or Home) keep `SheetTitle`: title left, close top right, no back. Game detail is a page stack: the game, then a sticker from it pushes that player's sticker book. Family sign in is a page in Settings, not a sheet.
- **The game is a sheet** (decision 20): the scoreboard is its root page (titled with the game's name, the round and goal beneath with sound and End game), Edit round and End game push inside it. Dealing in closes New game, then the game rises; Resume raises it; closing it keeps the game live. Victory takes over full screen as the sheet slides away.
- **Player counts** (decision 22): the game editor and Add a game end with Fewest / Most players (`PlayerFields`, `packages/app/src/sheets/PlayerFields.tsx`): typed freely, settled on leaving the field (2–12, Most never below Fewest, blank Most = no limit). The Games list adds "· 2 players" / "· 3+ players" to a limited game's line.
- **Edge-to-edge rows:** a horizontally scrolling row (`PillRow scroll`, `.pills.scroll`, the History filters) bleeds through its container's side gutter and pads back in, so chips slide off the screen's edge instead of being cut at the gutter, with room for the press shadow and pop. The gutters are `--gutter-l` / `--gutter-r`, set on `.app` and on `.sheet-body`: a new scroll container with side padding sets them too.
- **QR codes** (decision 21): ink dots on a cream plate in a jade ring, rounded deep-jade eyes with deep-fox centres, the fox in the middle; the same in both themes.
- **Settings is a landing of entry rows**, so it never scrolls on and on: the fox, then `LinkRow`s for install / share / the maker, then Players, Games and Appearance (each hinting what's inside: names, a count, "Dark · Sound on"), then Family (sign-in) inline at the bottom, then the build line. Each row (install, share, the maker, Players, Games, Appearance, Family sign in) **pushes a page**, and the editors (Edit Kate, Add a game, Edit Uno) push a third; archiving, deleting or adding goes back to the list by itself. Back is one tap top left; Close (top right) leaves from any depth.
- **Stable layout:** a sheet is laid out at full height from the start. Controls that aren't ready yet show skeletons (`.skeleton`, `.skeleton-stack` in `components.css`; see `NewGameSheet.tsx`) in the same slot, so nothing jumps when they appear. No progressive-disclosure jumps.
- Opening plays `open` (New game plays `deal`, its tune; the sticker book `sticker`), closing `close`. Drag down past 100px, backdrop tap or Escape closes.

## Components and stories

| Group | Path | Examples |
|---|---|---|
| Brand | `packages/ui/src/brand/` | `Fox`, `Icon`, `Wordmark`, `Chip`, `Badge`, `FoxNote` (the fox's badge with a headline and a line), `Sticker` (die-cut, locked, ×N), `Splash` (the launch screen) |
| Theme | `packages/ui/src/theme/` | `ThemeRoot` (sets `data-theme`, `THEME_COLOR`); no story of its own: every story renders inside it |
| Primitives | `packages/ui/src/primitives/` | `Button` (+ `ButtonLink`), `IconButton`, `ConfirmButton`, `Sheet`, `SheetNav` (pages pushed inside one sheet), `Segmented`, `Switch`, `TextInput`, `Toast`, `SyncBadge`, `LinkRow` (menu row: tile, title, hint, chevron), `StepList` (numbered how-to steps), `QrCode` (branded: ink dots on a cream plate in a jade ring, deep-jade/deep-fox eyes, the same in both themes; optional fox badge; encoder `uqr` loaded on demand; decision 21), `BottomNav`, `EmptyState`, `Pill` / `PillRow`, `Ribbon`, `Swatches`, and the small text pieces in `Card.tsx` (`Card`, `Eyebrow`, `SectionTitle`, `Notice`) |
| Scoreboard | `packages/ui/src/scoreboard/` | `PlayerCard`, `RaceTrack`, `RoundPips`, `RoundLog` (scores or wins), `WinnerPicker` ("Who won?"), `Standings` (▲ / ▼ under a rank only when the last game really changed the standings: a player passed someone they weren't ahead of, by wins. Drawing level, the name-order tiebreak, and winning or losing alone show nothing), `StatList`, `Podium`, `WinsChart`, `VictoryOverlay`, `ChampionCard`, `StickerPack` (the victory pack), `StickerShelf` (a row of earned stickers), `GameRow`, `ResumeCard`, `RollNumber`, `ScoreFields`, `FxCanvas` (from `feel/`, the confetti layer) |
| App sheets and screens | `packages/app/src/*.stories.tsx` | `Sheets.stories.tsx` (Sheets/App sheets), `Install.stories.tsx` (Sheets/Install and share: install pop-up, Settings landing, Share, Contact), `Family.stories.tsx`, `TallyApp.stories.tsx` |
| Foundations | `apps/storybook/src/foundations/` | Start here, Colour, Type, Shape, Motion, Sound, Haptics, Icons |

- Every `ui` component has `<Name>.stories.tsx` beside it, one story per meaningful state.
- The preview decorator renders each story in Dark and Daylight side by side; don't wrap stories in a theme. Overlays set `parameters: { tally: { overlay: true } }`; full screens set `bare: true` and render their own `ThemeRoot`.
- Components get an autodocs Docs page; full-screen stories opt out with `tags: ['!autodocs']`.
- Destructive actions use `ConfirmButton` (first tap arms it coral with a shake and `error`, second confirms). Scoring never asks for confirmation.

## Copy voice

Warm, short, playful; the fox is the narrator. Sentence case, plain words, no jargon ("Deal in", "The fox is napping."). Errors say what to do next. Every string lives in `packages/app/src/copy.ts` (`COPY`); strings marked (prototype) there are verbatim and stay that way. Tests select by these exact labels, so changing one means updating its specs.

## Deliberate deviations

| From the prototype | Why |
|---|---|
| `--faint` lifted from `#6a64a0` to `#8d86be` (dark); `--faint-deco` keeps the old value for placeholders | WCAG AA (4.5:1 on `--surface`) |
| Daylight theme and `-text` tokens | Two themes, AA for small coloured text |
| No selection/callouts, `touch-action` everywhere | Native feel in an installed PWA |
| Sticky sheet titles and CTA, editors as pushed pages (SheetNav), skeletons | Sheet stability: nothing jumps, the main action is always reachable |
| Sound audible on silent, released when idle | The family's iPhones live on silent |

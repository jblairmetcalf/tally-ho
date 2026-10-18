# Design

The design language: tokens, type, shape, motion, sound, haptics, native feel, sheets, components and copy. Read this before building or restyling any UI.

The reference is the original prototype, `docs/imports/Tally Ho!.html` (open it in a browser). Port its look, timings, sounds and copy faithfully; deviate only where listed under [Deliberate deviations](#deliberate-deviations).

## Tokens

All colour comes from `packages/ui/src/styles/tokens.css`. Components use `var(--token)` or the mapped Tailwind utilities (`bg-surface`, `text-muted`, `border-line`, `font-display`…), never raw hex. Brand art (`Fox`, the icon) is the only exception.

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
| Accents | `--jade`, `--amber`, `--fox`, `--coral`, `--lav`, `--cream` (+ `-deep` pressed edge, `-rgb` for alpha) | Fills, buttons, glows |
| Small coloured text | `--jade-text`, `--amber-text`, `--coral-text` | Any coloured text under ~18px. In Daylight these are darker shades so they pass AA; fills keep the plain token |
| On accent | `--on-accent`, `--ink` | Text on jewel fills |
| Players | `--p0`…`--p7` | The prototype's eight chip colours. Players store a palette index; use `paletteVar(i)` (`packages/ui/src/brand/palette.ts`). `PLAYER_COLORS` is only for canvas/SVG |

## Type

| Role | Font | Token |
|---|---|---|
| Display (titles, big numbers, victory) | Lilita One | `--f-display` / `font-display` |
| Body | Nunito 600–900 | `--f-body` / `font-body` |

Fonts load via `next/font` in `apps/web/app/layout.tsx`. Numbers use `.num` (tabular figures).

## Shape and the 3-D press

- Radii: `--r` 16 (cards), `--r-sm` 12, `--r-btn` 14, `--r-nav` 22, `--r-sheet` 26.
- Buttons sit on a solid drop edge: `box-shadow: 0 4px 0 var(--jade-deep)` (or `--amber-deep`, `--line` for ghost). On `:active` the button moves down and the edge shrinks to `0 1px 0`, so it feels physically pressed. Keep this on any new pressable surface (`.btn`, `.icon-btn` in `components.css`).
- Cards use a soft drop (`0 3px 0 var(--drop-soft)`); display type gets `--display-shadow`.

## Motion

- Keyframes live in `packages/ui/src/styles/motion.css`: every prototype keyframe verbatim (`rise`, `pop`, `crownDrop`, `bump`, `deltaUp`, `ribbon`, `sheetIn`, `toastIn`, `matchGlow`…) plus `dangerGlow` for lowest-wins games. Add new ones there.
- The spring curve is `--spring: cubic-bezier(0.25, 1.45, 0.45, 1)` (`ease-spring`).
- **Reduced motion:** the `prefers-reduced-motion: reduce` block at the bottom of `motion.css` is the single kill switch (durations → 0.001ms). Never bypass it with JS timing; confetti (`FX`) skips itself.
- Motion must never delay input: the next tap is always available.

## Sound

A Web Audio synth with no audio files: `SFX` in `packages/ui/src/feel/sfx.ts` (the prototype's 8-bit cues, verbatim). The store plays cues through `effects.play(cue)`; cues with a matching haptic also buzz.

| Cue | When |
|---|---|
| `tap` | Key press, nav tap, small toggles |
| `pick` | Choosing a pill, resuming, a win reported from another phone |
| `open` / `close` | A sheet slides up / away |
| `add` / `remove` | A player joins / leaves the line-up |
| `start` | Deal in: a new game |
| `submit` | A round is scored or saved |
| `lead` | Someone takes the lead |
| `match` | Someone reaches match point (within 15% of the target) |
| `tie` | Tied at the end: tiebreak |
| `error` | A refused action; arming a `ConfirmButton` |
| `del` | Something is deleted |
| `win` | The fanfare (victory) |
| `lose` | The losers' sting, 2.3 s after the fanfare (`VictoryOverlay`) |

iOS rules (why it's built this way: [DECISIONS.md](DECISIONS.md#10-ios-audio-playback-only-while-sounding), [LESSONS.md](LESSONS.md)): a sound creates its own audio context inside the tap that plays it; `playback` session is held only while sounding and released after 6 s idle, on hide (`SFX.sleep`) and on mute. The header speaker button is the only sound toggle (`prefs.muted`).

## Haptics

`Haptics` (`packages/ui/src/feel/haptics.ts`): named patterns (`tap`, `pick`, `submit`, `add`, `lead`, `match`, `error`, `del`, `win`). Vibration API on Android; on iOS 18+ a hidden `<input type="checkbox" switch>` click plays the system tick, one per pulse. `effects.ts` buzzes on `submit`, `win`, `lead`, `match`, `error`, `del`. Off when `prefs.haptics` is false.

## Confetti

`FX` (`packages/ui/src/feel/confetti.ts`) draws suit-shaped confetti on one shared canvas (`<FxCanvas/>`). Bursts come from the pressed element (`effects.burstFrom`) and the victory cannon. Skips under reduced motion.

## Native feel

The app should feel like an iOS app, not a web page. Base rules are in the top of `packages/ui/src/styles/components.css` (and `apps/web/app/globals.css` for the page):

- `.tally` sets `user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`.
- `touch-action: manipulation` on **every** element (`:where(.tally) *`), because it doesn't inherit; this removes the double-tap-zoom tap delay. Elements needing more (the sheet's grab handle) set their own.
- Images, SVGs and links can't be dragged.
- Inputs, textareas, `contenteditable` and `.selectable` opt back in to selection and callouts.
- Base element resets are wrapped in `:where()` so component classes always win.
- Guarded by the "feels native" test in `e2e/pwa.spec.ts`.

## Sheets

`Sheet` and `SheetTitle` (`packages/ui/src/primitives/Sheet.tsx`, Radix Dialog underneath).

- `.sheet-title` (title + close button) is sticky at the top while the sheet scrolls.
- `.sheet-cta` pins the sheet's main action to the bottom, always one tap away; its label stays on one line.
- Editors open as **nested sheets** over their parent (Settings → edit player / edit game); a sheet inside another's content is nested automatically (`SheetDepth`), and Escape closes only the top one.
- **Stable layout:** a sheet is laid out at full height from the start. Controls that aren't ready yet show skeletons (`.skeleton`, `.skeleton-stack` in `components.css`; see `NewGameSheet.tsx`) in the same slot, so nothing jumps when they appear. No progressive-disclosure jumps.
- Opening plays `open`, closing `close`. Drag down past 100px, backdrop tap or Escape closes.

## Components and stories

| Group | Path | Examples |
|---|---|---|
| Brand | `packages/ui/src/brand/` | `Fox`, `Icon`, `Wordmark`, `Chip`, `Badge`, `FoxNote` (the fox's badge with a headline and a line) |
| Primitives | `packages/ui/src/primitives/` | `Button` (+ `ButtonLink`), `IconButton`, `ConfirmButton`, `Sheet`, `Segmented`, `Switch`, `TextInput`, `Toast`, `SyncBadge`, `LinkRow` (menu row: tile, title, hint, chevron), `StepList` (numbered how-to steps), `QrCode` (always dark-on-white, optional fox badge; encoder `uqr` loaded on demand) |
| Scoreboard | `packages/ui/src/scoreboard/` | `PlayerCard`, `RaceTrack`, `RoundPips`, `RoundLog` (scores or wins), `WinnerPicker` ("Who won?"), `Standings`, `StatList`, `Podium`, `WinsChart`, `VictoryOverlay` |
| App sheets and screens | `packages/app/src/*.stories.tsx` | `Sheets.stories.tsx`, `Family.stories.tsx`, `TallyApp.stories.tsx` |
| Foundations | `apps/storybook/src/foundations/` | Colour, Type, Shape, Motion, Sound, Haptics, Icons |

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
| Sticky sheet titles and CTA, nested editors, skeletons | Sheet stability: nothing jumps, the main action is always reachable |
| Sound audible on silent, released when idle | The family's iPhones live on silent |

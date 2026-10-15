# Build contract

The exact public APIs the parallel builders code against. Exported from the package `index.ts`.
`color` is always a palette index (`number`, 0–7) unless noted; render it with `paletteVar(i)`.

## Already built (don't rewrite)
- `@tally/core` — schemas (`Game`, `Player`, `Preset`, `Round`, `Store`, `Prefs`, `Clock`), scoring
  (`totalsOf leadersOf leaderOf evaluate ranked nearTarget goalLabel parseScore ordinal hash`),
  stats (`computeStats winSeries isCompleted`), `makeSamples freshStore emptyStore migrate slug`,
  `DEFAULT_PRESETS DEFAULT_PLAYERS DEFAULT_PREFS PALETTE_SIZE`.
- `@tally/ui` — `ThemeRoot {theme:'dark'|'light'}`, `THEMES`, `THEME_COLOR`, `Fox {crown wink twitch}`,
  `Chip {name color size crown crownKey}` (color: index or CSS string), `Icon {name size stroke}`,
  `ICONS`, `paletteVar`, `PLAYER_COLORS`, `PLAYER_COLOR_NAMES`, `Button {variant size block armed icon}`,
  `IconButton {icon label on danger}`, `SFX` (+ `SFX_CUES`), `FX` (`burst fromEl celebrate`, `attachCanvas`),
  `Haptics.play(cue)` / `HAPTICS`, `SUITS`, `cx`.
- CSS: `packages/ui/src/styles/{tokens,motion,components}.css` — class names follow the prototype
  (`.card .pill .seg .pcard .lane .log-row .sheet …`). Renamed: `.btn-block`, `.btn-sm`, `.topbar`.
  New: `.switch`, `.setting`, `.swatches/.swatch`, `.pcard.danger`, `.tag.danger`, `.finish.bust`,
  `.pill .low-tag`, `.nav.in-flow`, `.toast.in-flow`, `.ribbon-wrap.in-flow`, `.ribbon.still`.

## Builder A — `packages/ui/src/primitives/*`, `packages/ui/src/brand/*` (stories), `apps/storybook/src/foundations/*`
- `ConfirmButton {label, armedLabel, icon?, onConfirm, onArm?}` — coral two-tap delete; `onArm` fires on the first tap (caller plays `SFX.error`).
- `Pill {on?, onClick, children, chip?: {name, color}}`, `PillRow {scroll?, label?, children}`
- `Segmented<T extends string> {options: {value: T, label: string}[], value, onChange, label}` (radiogroup)
- `Switch {checked, onChange(next), label}` (role="switch"), `Setting {title, hint?, children}` (a `.setting` row)
- `TextInput` — forwardRef `<input className="input">`, all input props
- `Card {as?: 'section'|'div', className?, style?, children}`, `Notice {children, action?}`, `Eyebrow`, `SectionTitle` (h2.sec)
- `Toast {message, icon?: IconName (default 'crown'), placement?: 'nav'|'bottom'|'inline'}`
- `Ribbon {text, tone?: 'jade'|'amber'|'coral', inline?}` (inline = in-flow + still, for stories)
- `Sheet {open, onClose, label, children}` — Radix Dialog; keeps itself mounted ~290ms after `open` goes false to play `.closing`; grab handle drag-to-dismiss (>100px) exactly like the prototype; Escape + backdrop close. `SheetTitle {title, onClose}` (h3 + close IconButton). No sounds inside.
- `EmptyState {crown?, title, body, action?: ReactNode}`
- `BottomNav {screen: 'home'|'history'|null, live: boolean, foxKey: number, onHome, onHistory, onFab, inline?}`
- `Wordmark` (per-letter drop), `Badge` (62px ink disc with the fox)
- `Swatches {value: number, onChange(i), label, taken?: number[]}` (radiogroup of the 8 chip colours)

## Builder B — `packages/ui/src/scoreboard/*`, `packages/ui/src/feel/FxCanvas.tsx`
- `FxCanvas` — renders `<canvas className="fx-canvas">` and calls `attachCanvas`.
- `RollNumber {value}` — 18-step ease-out count (22 ms ticks), as prototype `Roll`.
- `PlayerCard {name, color, total, lead, near?: 'match'|'danger'|null, delta?: number|null, bumpKey?: string|number, sub, crownKey?}` — `.pcard`; `near='match'` shows "Match pt" tag + glow; `'danger'` shows coral "Danger" tag + dangerGlow (low-wins near bust).
- `RaceTrack {players: {id, name, color, total}[], target, lowWins}` — lanes + checkered finish (`.finish.bust` when lowWins); foot "0 … Finish at N" / "Bust at N".
- `RoundPips {target, done}` — pips + "N left".
- `ScoreFields {players: {id, name, color}[], values: string[], onChange(values), onDone, idPrefix, onSign?}` — chip, name, ± button, numeric input; Enter → next field, last Enter → blur + onDone. Input sanitising identical to prototype.
- `RoundLog {players: {id, name, color}[], rounds: Round[], lowWins, editable, freshKey?, onEdit?(idx)}` — newest first; best score per round highlighted (`.sc.top`, the max >0, or the min for lowWins); pencil when editable. `freshKey` changes → newest row plays `rowIn`.
- `ResumeCard {name, sub, onClick}`
- `ChampionCard {leaders: {name, color}[], wins, total, streak?: {name, n} | null}` — one leader = crowned chip + "Family champion"; several = "Dead heat", `=` chip in `var(--faint)`, names joined " & ".
- `Standings {rows: {id, name, color, wins, played}[]}`
- `StatTile {icon: IconName, tone: 'jade'|'coral'|'amber'|'lav', value: ReactNode, label: string, compact?}`
- `GameRow {name, winner: {name, color}, completedAt: string, rounds: number, totals: {id, name, color, total, won: boolean}[], onClick}`
- `WinsChart {series: {id, name, color, pts: number[]}[]}` — prototype step chart, label de-collision.
- `Podium {rows: {id, name, color, total}[], showLast?: boolean, delayMs?: number}` — ordinal, chip (crown on 1st), name, total; last gets "Next time" + wobble when showLast and >2 rows.
- `VictoryOverlay {winner: string, gameName, total, rows (Podium rows), onDone, onRematch}` — sunburst, crowned winking fox badge, stamped name, "wins X with N", podium, Done / Rematch. On mount: `FX.celebrate()` and `SFX.lose()` after 2300 ms (prototype). The caller plays `SFX.win`.

## Builder C — `packages/app/*`, `apps/web/*`, `scripts/icons.ts`, `e2e/*`, `playwright.config.ts`
Store (zustand), provider, effects, screens, sheets, PWA. Uses A and B exactly as specified above.

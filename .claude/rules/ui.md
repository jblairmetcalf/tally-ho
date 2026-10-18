---
paths:
  - "packages/ui/**"
---

# packages/ui — the design system

Context: CONVENTIONS.md, docs/DESIGN.md. Skills: `new-component`, `visual-check`.

- **Tokens only.** Colours come from `packages/ui/src/styles/tokens.css` (`var(--surface)`, `bg-surface`, `text-muted`…). Never a raw hex in a component: both themes must follow automatically. Brand art (`Fox`, the icon) and `PLAYER_COLORS` (canvas/SVG literals) are the only exceptions.
- **Player colours are palette indices** → `paletteVar(i)` from `packages/ui/src/brand/palette.ts`. A player's colour is 0–7 data, not a CSS value.
- **Small coloured text uses the `-text` tokens** (`--jade-text`, `--amber-text`, `--coral-text`; `text-jade-text`…). The plain jewels are fills; as text they fail AA in Daylight.
- **Placeholders use `--faint-deco`**; readable secondary text uses `--faint`/`--muted` (lifted to 4.5:1). Decoration may recede; information may not.
- **Both themes, always.** Check every change in `dark` and `light` (Daylight). Light overrides live under `[data-theme="light"]` in `tokens.css`; add a token there rather than a one-off override in `components.css`.
- **Component CSS goes in `packages/ui/src/styles/components.css`**, inside `@layer components`, on tokens. Append; don't restyle existing rules for a new component.
- **Resets stay in `:where(.tally)`** so they have zero specificity and any component class wins. Don't add element selectors outside `:where()`.
- **`touch-action: manipulation` is set on every element** (it doesn't inherit). Only something that owns a gesture (the sheet's `.grab`) sets its own. Keep it: it removes the double-tap-zoom delay.
- **Targets ≥ 44px** (stretch the hit area like the switch does if the look is smaller). Every icon-only control has an accessible name (`IconButton` takes `label`).
- **Motion is the keyframes in `packages/ui/src/styles/motion.css`.** Its `prefers-reduced-motion` block is the single kill switch: never `!important` around it, never animate from JS without checking it (confetti in `packages/ui/src/feel/confetti.ts` skips under reduced motion).
- **Port, don't invent.** Behaviour, timings, sounds and animations come from the prototype in `docs/imports/`. When in doubt, do what it does.
- **Sheets:** a single-page sheet is `Sheet` + `SheetTitle` (sticky `.sheet-title`, close top right). A sheet with pages is `<Sheet nav>` + `SheetNav`: one fixed header (back top left past the root, the page title, close always top right), pages pushed right-to-left, each its own scroller, the dialog named by the page on top. Never nest a `<Sheet>` in another. The main action sits in a `.sheet-cta` (sticky bottom of its page). Escape is the Sheet's (back a page in a nav, else close); don't add your own key handlers.
- **Feel is the caller's job.** Components take callbacks; the store/screens play `SFX` / `Haptics` / `FX` (see the `onClose` / `ConfirmButton` / `ScoreFields` doc comments). The only built-in cue is `VictoryOverlay`'s timed lose sting.
- **No copy strings.** Every user-facing string is a prop; the words live in `packages/app/src/copy.ts`. Stories pass sample text.
- **No store, no `next/*`, no `@tally/app` imports** here. `@tally/core` types and pure helpers are fine.
- **Every component has `<Name>.stories.tsx` beside it** covering each meaningful state (empty, long names, 2 vs 12 players, disabled, armed, low-wins…). See `.claude/rules/storybook.md`.
- **Export it from its area barrel** (`packages/ui/src/primitives/index.ts`, `brand/index.ts`, `scoreboard/index.ts`, `feel/index.ts`); `packages/ui/src/index.ts` re-exports the barrels.
- **Keyboard:** everything reachable and operable; radio groups use the roving helper in `packages/ui/src/primitives/roving.ts`.
- **No new dependencies** without saying so (Radix Dialog is the one overlay primitive).
- After a visual change: `node scripts/shoot.mjs <story-id>` at 390 and 320, both themes, and Read the PNGs.

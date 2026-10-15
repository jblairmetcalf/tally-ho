# Working in this repo

Short on purpose. Read before changing anything.

## Shape
- `apps/*` compose only: no business logic, no bespoke components.
- `packages/core` — Zod schemas (source of truth), pure scoring/stats logic, samples, migration. No React. Never reads the wall clock: take a `Clock`.
- `packages/ui` — the design system: tokens, keyframes, feel (sound, confetti, haptics), brand art, presentational components. No store, no `next/*`.
- `packages/app` — the store, the `DataProvider`, effects, screens and sheets. No `next/*`.
- Packages are consumed as TypeScript source; there is no build step.

## The original
`docs/imports/Tally Ho!.html` is the reference. Port its behaviour, copy, timings, sounds and animations faithfully. When in doubt, do what it does.

## Rules
1. **No raw colours in components.** Use the CSS classes in `packages/ui/src/styles/components.css` and the tokens in `tokens.css` (`var(--surface)`, `bg-surface`, `text-muted`…). Player colours are palette indices → `paletteVar(i)`. Brand art (`Fox`, the icon) is the only exception.
2. **Feel is built in.** Sounds come from `SFX`, haptics from `Haptics`, confetti from `FX` (all in `@tally/ui`). Animations are the keyframes in `motion.css`; the reduced-motion block there is the kill switch — don't bypass it.
3. **Two themes.** Everything must read well in `dark` and `light` (Daylight). Small coloured text uses the `-text` tokens (`--jade-text`, `--amber-text`, `--coral-text`); fills use the plain ones.
4. Targets ≥ 44px. Everything keyboard reachable. Every icon-only control has an accessible name.
5. **Stories.** Every `ui` component has `<Name>.stories.tsx` beside it covering each meaningful state. The Storybook decorator renders every story in both themes side by side; don't wrap stories in a theme. Overlays (sheets, toasts, victory) set `parameters: { tally: { overlay: true } }`; full screens set `bare: true` and render their own `ThemeRoot`.
6. **No new dependencies** without saying so.

## Commands
- `pnpm typecheck` · `pnpm test` · `pnpm lint` (`pnpm format` to fix)
- `pnpm dev` — the app on :3100 · `pnpm storybook` — Storybook on :6116
- `pnpm e2e` — Playwright (iPhone 14)

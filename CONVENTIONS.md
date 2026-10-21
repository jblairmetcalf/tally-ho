# Working in this repo

Short on purpose. These apply everywhere; the detail for each area lives in its rule file (below),
which Claude Code loads automatically when you touch that area.

## Shape
- `apps/*` compose only: no business logic, no bespoke components.
- `packages/core`: Zod schemas (source of truth), pure scoring/stats logic, samples, migration. No React; takes a `Clock`.
- `packages/ui`: the design system (tokens, keyframes, sound, confetti, haptics, brand art, components). No store, no `next/*`.
- `packages/app`: the store, the `DataProvider` seam, effects, screens, sheets and sync. No `next/*`.
- Packages are consumed as TypeScript source; there is no build step.
- Two modes behind one seam: **demo** (signed out, this phone) and **family** (signed in, Firestore). Screens never ask which.

## The original
`docs/imports/Tally Ho!.html` is the reference (and `docs/imports/Tally Ho Sticker Club.html` for the Sticker Club, decision 24; `docs/imports/Tally Ho! Mixtape Feature Spec.md` for the Fox Trot, decision 27, and `docs/imports/Tally Ho Chime Lab.html` for how a song ends, decision 29). Port its behaviour, copy, timings, sounds and animations
faithfully. Deviate only on purpose (accessibility, native feel, sheet stability) and record why in
`docs/DECISIONS.md`.

## Rules
1. **Tokens, not raw colours.** Brand art (the fox, the icon) is the only exception.
2. **Two themes, always.** Dark and Daylight, WCAG AA (small coloured text uses the `-text` tokens).
3. **Feel is built in, and respects reduced motion.** Sound, haptics, confetti and motion come from `@tally/ui`.
4. **Native feel.** Targets ≥ 44px, no text selection or callouts outside text fields, no tap delay, no pinch or double-tap zoom, every icon-only control named.
5. **Every component has stories** covering each meaningful state.
6. **Never lose a score.** No hard deletes; finished games are frozen; offline writes are kept until synced.
7. **Strings live in `packages/app/src/copy.ts`.**
8. **No new dependencies** without saying so.
9. **Record decisions and lessons.** A non-obvious choice goes in `docs/DECISIONS.md`; a trap you hit goes in `docs/LESSONS.md`.

## Where the detail lives
| Touching | Rules | Context |
|---|---|---|
| `packages/ui` | `.claude/rules/ui.md` | `docs/DESIGN.md` |
| `packages/core` | `.claude/rules/core.md` | `docs/ARCHITECTURE.md` |
| `packages/app` | `.claude/rules/app.md` | `docs/ARCHITECTURE.md` |
| sync, `firestore.rules` | `.claude/rules/sync.md` | `docs/SYNC.md` |
| tests, `e2e/` | `.claude/rules/testing.md` | `docs/TESTING.md` |
| Storybook, stories | `.claude/rules/storybook.md` | `docs/DESIGN.md` |
| `apps/web`, `scripts/` | `.claude/rules/pwa-web.md` | `docs/ARCHITECTURE.md` |

## Commands
- `pnpm format` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm check:harness` · `pnpm drift` (rule probes)
- `pnpm dev`: the app on :3100 · `pnpm storybook`: Storybook on :6116
- `pnpm e2e`: Playwright (app on iPhone 14, every story) · `pnpm e2e:cloud` / `pnpm test:rules`: Firebase emulators (need Java; CI)
- `pnpm firebase:rules` / `pnpm deploy`: the user runs these

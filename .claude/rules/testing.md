---
paths:
  - "e2e/**"
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "playwright.config.ts"
---

# Tests — Vitest and Playwright

Context: docs/TESTING.md. Skill: `verify`.

- **Select by exact accessible labels** (`getByRole('button', { name: 'Score round 1' })`, `getByLabel('Kate score')`). The labels come from `packages/app/src/copy.ts`; the sync ones are fixed in `docs/SYNC.md` ("Exact labels"). No CSS selectors except the few helpers in `e2e/helpers.ts` (`card`, `victory`).
- **Seed through `e2e/helpers.ts`**: `seed(page, household())` / `withSamples()` before `page.goto`. Seeds only when storage is empty, so a reload keeps what the test did. Reuse `openNewGame`, `startPreset`, `scoreRound`.
- **Deterministic time.** Unit tests inject `fixedClock` (`packages/app/src/fixtures.ts`) or a `Clock` literal and use `vi.useFakeTimers()` for store timings; sync tests use `tickingClock` from `packages/app/src/sync/testkit.ts`. Never assert on `Date.now()`.
- **Wait on state, not time.** Prefer `expect(...).toBeVisible()`, `expect.poll(...)`, `waitFor`. A `waitForTimeout` is only for letting animations settle before axe (and say why in a comment).
- **Sheets trap focus until their closing animation ends**: wait for `toBeHidden()` on the dialog before touching what's behind it.
- **Motion**: the storybook project runs with `reducedMotion: 'reduce'`; web specs that measure contrast let entrances finish first.
- **Sound off in e2e** (`muted: true` in the helpers) so no AudioContext surprises, except the specs that test audio.
- **One concern per spec file**: `e2e/game.spec.ts` (play), `e2e/game-modes.spec.ts` (how a game ends: "Who won?", per-player rounds, ties), `e2e/settings.spec.ts`, `e2e/install-share.spec.ts` (install pop-up, share QR, contact), `e2e/pwa.spec.ts` (offline, migration, theme flash), `e2e/storybook.spec.ts` (every story, both themes, axe), `e2e/storybook-manager.spec.ts` (every story inside the manager UI), `e2e/cloud.spec.ts` (emulator only).
- **Fresh run before claiming green**: `CI=true pnpm e2e` (≈5 min). Without `CI`, Playwright reuses whatever server is on 3101/3103 and may test a stale build.
- **Quick loop**: `pnpm exec playwright test --project=web e2e/game.spec.ts`, `pnpm exec playwright test --project=storybook -g "Primitives/Sheet"` (after `pnpm --filter @tally/storybook build`). These reuse whatever already serves 3101/3103 too: rebuild the web export (`pnpm --filter @tally/web build`) after a change, or the run tests the old build.
- **Name every new spec and test file in `docs/TESTING.md`**: `pnpm drift` (`spec-docs`) lists any that aren't.
- **Ports 3101/3103/3105 are the test servers** (`playwright.config.ts`); never point a test at `pnpm dev` (3100) or `pnpm storybook` (6116).
- **Emulator suites are CI-only here**: `rules.test.ts` is `describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)`; `cloud.spec.ts` runs only with `CLOUD_E2E=1`. Report them as not run locally.
- **Story coverage is automatic**: a new story is picked up from `index.json`; you don't add a test, but it must pass axe (serious/critical) in both themes.
- **Unit tests sit beside the code** (`*.test.ts`), vitest in node by default; add the `// @vitest-environment jsdom` pragma only where React renders.
- **A failing test is information**: fix the cause or the test's wrong assumption; never loosen an assertion or add a retry to get green.

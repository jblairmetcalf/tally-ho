# Testing

Every test suite: what it guards, where it lives, how to run it and how to add to it. Read this before adding a feature (to know which suite proves it) or when CI is red.

## Suites

| Suite | Guards | Where | Run | Time |
|---|---|---|---|---|
| core (Vitest) | Score parsing, scoring and end conditions (score, rounds, "Who won?", open; one round per player), tiebreak, lowest-wins, match point, stats, deterministic samples, prototype migration | `packages/core/src/core.test.ts` | `pnpm test` | seconds |
| store (Vitest) | Every store action with fake timers: starting, scoring, banners/toasts, finishing, editing, presets, prefs, and **remote reactions** (`replaceData`: flash, victory elsewhere, ended elsewhere) | `packages/app/src/store.test.ts` | `pnpm test` | seconds |
| sync (Vitest, fake Firestore) | `diff` and documents → Store; `cloudProvider` (one write per round, concurrent rounds, offline flush, no echo, mirror, outbox replay after a kill, rejections roll back, a "Who won?" game finishing in one write, a tie crowned by the game's tiebreak, `roundsPerPlayer` set and cleared across phones); `session` (sign-in, not-family, error mapping, boot from flag, sign-out clears); **fuzz**: two phones, 50 runs × 30 random actions (all four goals, winner taps, tiebreak crowns, `roundsPerPlayer` presets) with random offline toggling, converge to identical stores | `packages/app/src/sync/{diff,cloudProvider,session,fuzz}.test.ts` | `pnpm test` | seconds |
| TallyApp wiring (Vitest, jsdom) | Rejected write → toast; a new session swaps in a fresh store; explicit `provider` still works | `packages/app/src/sync/TallyApp.session.test.tsx` | `pnpm test` | seconds |
| rules (Vitest + emulator) | `firestore.rules`: non-members denied; shapes (incl. `'wins'` with an int target, optional `roundsPerPlayer`, old docs without it); no hard deletes of games/players; finished games frozen | `packages/app/src/sync/rules.test.ts` | `pnpm test:rules` (needs Java 21+) | ~1 min |
| web (Playwright, iPhone 14) | Gameplay (race, rounds, open-ended, tiebreak, Hearts lowest-wins, edit/delete round, rematch); settings (rename, unique preset names, Add player disabled, empty History; pages pushed in one Settings sheet: Back/Close/Escape, focus return, dialog named by the page, archive/delete pop back); axe on Home in both themes; PWA (offline after one visit, `tallyho.v2` migration, no theme flash); native feel; sound lifecycle | `e2e/game.spec.ts`, `e2e/settings.spec.ts`, `e2e/pwa.spec.ts` | `pnpm e2e` | a few min (includes builds) |
| storybook (Playwright, desktop) | Every story renders with no page errors and no serious/critical axe violations, in both themes | `e2e/storybook.spec.ts` | `pnpm e2e` | a few min |
| storybook manager (Playwright) | Every story and Docs page opens inside the real Storybook UI without errors | `e2e/storybook-manager.spec.ts` | `pnpm e2e` | a few min |
| cloud (Playwright + emulators) | Demo by default, sign-in syncs; a game (Flip 7, race to 200) started on one phone appears live on another; a round scored offline survives reload and syncs; non-member turned away; sign-out back to demo | `e2e/cloud.spec.ts`, `e2e/cloud-helpers.ts` | `pnpm e2e:cloud` (needs Java 21+) | a few min |

Notes:
- `pnpm test` runs Vitest in each package via turbo. `rules.test.ts` skips itself unless `FIRESTORE_EMULATOR_HOST` is set (`describe.skipIf`), so it's silent under `pnpm test`.
- `pnpm e2e` builds Storybook, then Playwright builds the web export and serves both with `scripts/serve.mjs` (ports 3101, 3103). It runs the `web` and `storybook` projects (`playwright.config.ts`).
- `pnpm e2e:cloud` sets `CLOUD_E2E=1` inside `firebase emulators:exec` (Auth 9099, Firestore 8080, project `demo-tally`). Only the `cloud` project runs, serially, against a build made with `NEXT_PUBLIC_FIREBASE_EMULATOR=1` into out-cloud on port 3105.
- Without Java, the emulator suites can't run locally; rely on CI.

## CI (`.github/workflows/ci.yml`)

| Job | Steps | Needs |
|---|---|---|
| `check` | `pnpm lint`, `pnpm typecheck`, `pnpm test` | — |
| `e2e` | `pnpm e2e` (Chromium); uploads test-results on failure | `check` |
| `cloud` | Java 21, `pnpm test:rules`, `pnpm e2e:cloud`; uploads test-results on failure | `check` |

Playwright retries once on CI (`retries: process.env.CI ? 1 : 0`).

## Adding a test

| You changed | Add | How |
|---|---|---|
| Scoring, stats, samples, migration | A case in `packages/core/src/core.test.ts` | Pure functions; pass a fixed `Clock`, never the wall clock |
| A store action or reaction | A case in `packages/app/src/store.test.ts` | `createTallyStore(memoryProvider(initial), fixedClock, { effects: createEffects({ silent: true }) })` with Vitest fake timers; scenarios in `packages/app/src/fixtures.ts` (`fixedClock`, `SCENARIOS`) |
| A synced field or write path | Cases in `diff.test.ts` / `cloudProvider.test.ts` | Use the in-memory Firestore `packages/app/src/sync/fake.ts` and helpers in `packages/app/src/sync/testkit.ts` (`seedFamily`, `phone`, `settle`, `tickingClock`); several phones (`FakeFirestore` clients) share one `FakeBackend`, and each client's `setOffline` toggles its connectivity |
| `firestore.rules` | A case in `rules.test.ts` (and update [SYNC.md](SYNC.md)) | `@firebase/rules-unit-testing`; run `pnpm test:rules` or in CI |
| A user flow | A test in `e2e/game.spec.ts` / `e2e/settings.spec.ts` / `e2e/pwa.spec.ts` | `seed(page, household())` or `withSamples()` from `e2e/helpers.ts`, then drive by role and exact label |
| A component or state | A story in `<Name>.stories.tsx` | It's picked up automatically by both Storybook suites |
| Family sync end to end | A test in `e2e/cloud.spec.ts` | Helpers in `e2e/cloud-helpers.ts` (`resetFamily`, `newPhone`, `signInAs`, `syncBadge`); tests run in order against one emulator |

## Conventions

- **Exact labels.** Select by role + accessible name, using the strings in `packages/app/src/copy.ts` (e.g. `Score round 3`, `Deal in · Flip 7`, `Family sign in`). Changing a label means changing its specs. Sync labels are listed in [SYNC.md](SYNC.md#ui-labels).
- **Seeds.** `e2e/helpers.ts`: `seed()` writes `tallyho.v3` before boot (only if empty, so reloads keep state); `household()` = Kate, Blair, Alder, no history, muted; `withSamples()` = demo samples, muted. Both add the internal `TEST_PRESETS` (Hearts, race to 100, lowest wins) beside the defaults. Flows: `openNewGame`, `startPreset`, `scoreRound`, `card`, `toast`, `victory`.
- **Fixed clocks.** core and store tests use `fixedClock` (`packages/app/src/fixtures.ts`); samples are deterministic.
- **Reduced motion.** The storybook project runs with `reducedMotion: 'reduce'` so axe measures final frames.
- **Sound in tests:** seeds are muted; the sound test in `e2e/pwa.spec.ts` counts `AudioContext`s and oscillators instead of listening.
- Wait for UI by assertion (`expect(...).toBeVisible()`, `expect.poll`), not timeouts, except where a settle is the point.

## Reading failures

- Playwright keeps traces on failure in test-results (per project). Open one with `pnpm exec playwright show-trace <trace.zip>`. CI uploads the same folder as an artifact (`playwright-traces`, `playwright-traces-cloud`).
- Run one test: `pnpm exec playwright test e2e/game.spec.ts -g "tiebreak"` (after `pnpm e2e` has built Storybook once, if you include the storybook project).
- Vitest: `pnpm --filter @tally/app exec vitest run src/store.test.ts`.
- A red run right after someone else's edit may be a half-written file; re-run before debugging ([LESSONS.md](LESSONS.md)).

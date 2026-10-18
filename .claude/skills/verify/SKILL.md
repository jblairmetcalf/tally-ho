---
name: verify
description: Run Tally Ho!'s full local check (format, lint, typecheck, unit tests, Playwright web + storybook suites from a clean build) and report real counts. Use before saying any change is done, before committing or shipping, after touching more than one package, or whenever someone asks "is it green?". Also lists the targeted commands for a fast inner loop.
---

# Verify

Never claim green without the command output in front of you. If a step fails, stop, fix the cause (or report it), and rerun from that step.

## Full run (≈5 min)

Run from the repo root, in order:

1. Start clean, so Playwright tests this tree, not a stale build:
   ```sh
   rm -rf apps/web/out apps/storybook/storybook-static
   ```
2. Format (writes fixes), then lint (must be clean):
   ```sh
   pnpm format
   pnpm lint
   ```
   If `pnpm format` changed files you didn't touch, say so in the report; don't silently include them in a commit.
3. Types across every package:
   ```sh
   pnpm typecheck
   ```
4. Unit tests (Vitest via turbo; core, ui and app each have tests):
   ```sh
   pnpm test
   ```
   Note the passed/skipped counts per package. `rules.test.ts` reports as skipped here: expected.
5. End to end, fresh servers (`CI=true` stops Playwright reusing a server already on 3101/3103):
   ```sh
   CI=true pnpm e2e
   ```
   This builds Storybook, builds the app, then runs the **web** project (gameplay, settings, PWA/offline, migration, theme flash, axe) and the **storybook** project (every story in both themes + axe, and every story/Docs page inside the manager UI).
   With `CI=true` Playwright retries a failure once: a test that passed on retry is **flaky**. Report it as flaky, not green.

## Quick inner loop (while iterating, not instead of the full run)

| What changed | Command |
|---|---|
| core logic | `pnpm --filter @tally/core test` |
| store / app | `pnpm --filter @tally/app test` |
| one store test | `pnpm --filter @tally/app exec vitest run src/store.test.ts -t "tiebreak"` |
| sync | `pnpm --filter @tally/app exec vitest run src/sync` |
| one e2e spec | `pnpm exec playwright test --project=web e2e/game.spec.ts` |
| one component's stories | `pnpm --filter @tally/storybook build && pnpm exec playwright test --project=storybook -g "Primitives/Sheet"` |
| one file's lint | `pnpm exec biome check <file>` |

The web project builds the app itself via its `webServer`; the storybook project needs `apps/storybook/storybook-static` built first.

## Not run locally (CI only)

- `pnpm test:rules`: `firestore.rules` against the Firestore emulator (needs Java 21+).
- `pnpm e2e:cloud`: family sync end to end against the Auth + Firestore emulators (needs Java).

CI (`.github/workflows/ci.yml`) runs both in its `cloud` job. If the change touches `firestore.rules`, `packages/app/src/sync/`, or `e2e/cloud.spec.ts`, say plainly that these were **not run** and that CI will.

## Report template

```
Verify (fresh build, <date/time>)
- format: <clean | fixed N files: …>
- lint: <clean | N errors>
- typecheck: <pass | fail: …>
- unit: core <p passed>, ui <p passed>, app <p passed, s skipped (rules: emulator-only)>
- e2e web: <p passed / f failed / k flaky> of <n>
- e2e storybook: <p passed / f failed / k flaky> of <n>  (stories + manager)
- not run locally: pnpm test:rules, pnpm e2e:cloud (need Java; CI runs them)
- failures / flakes: <test name → cause or "unknown" + its trace.zip from the test-results folder>
```

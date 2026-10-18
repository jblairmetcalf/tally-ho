---
paths:
  - "packages/core/**"
---

# packages/core — schemas and pure logic

Context: CONVENTIONS.md, docs/ARCHITECTURE.md.

- **Pure TypeScript.** No React, no DOM, no `window`/`localStorage`, no network. Everything else imports this; it must run anywhere (vitest node, Playwright helpers, the browser).
- **Never read the wall clock.** Take a `Clock` (`packages/core/src/schemas.ts`) and call `clock.now()`. `systemClock` is for app roots only. Deterministic in, deterministic out.
- **No `Math.random()`.** Randomness is the seeded `rng(seed)` in `packages/core/src/samples.ts`, so samples and fixtures are identical on every run.
- **Zod schemas are the source of truth.** Types are `z.infer<>` of the schemas in `packages/core/src/schemas.ts`; never hand-write a parallel interface.
- **A schema change is a migration.** Persisted data (`tallyho.v3`, the prototype's `tallyho.v2`, the family mirror) must still load: update `migrate()` / `withRoundIds()` in `packages/core/src/migrate.ts` and add a case to `packages/core/src/core.test.ts`.
- **Additive and optional first.** New fields on `Game`/`Round`/`Player` are `.optional()` so old data parses; only bump `version` if a shape truly changes.
- **A synced field is also a sync change**: docs, diff, rules and rules tests move together (skill `sync-change`, `.claude/rules/sync.md`).
- **Preset ids are slugs and stable** (`slug(name)`, e.g. `the-fox-in-the-forest`). They are document ids in Firestore and keys in saved data: never rename or reuse one.
- **`DEFAULT_PRESETS` / `DEFAULT_PLAYERS` only seed new stores** (`emptyStore`, `freshStore`, first family sign-in when the collections are empty). Changing them doesn't touch existing phones: say "Reset demo" in the hand-off.
- **Pick a preset's goal from the rulebook** (skill `add-game`, decision 16): `score` = race to a target, `rounds` = a fixed count (1 = one final tally; `roundsPerPlayer` = one per dealer, target follows the line-up via `targetFor`), `wins` = "Who won?" (one winner per round, first to `target` wins; 1 = a single game), `open` = ends when you say so. `lowWins`: lowest total wins (a score race's target becomes a bust line); keep it `false` for `wins`.
- **Samples are deterministic**: `makeSamples(clock)` with seeded rng, finished, newest first. The test pins this.
- **Blank score = `null`, counts as 0** (`parseScore`, `totalsOf`). Keep that distinction: a blank isn't a zero you typed.
- **Scoring rules live in `evaluate()`** (`packages/core/src/scoring.ts`): end, tiebreak, low-wins bust. UI never re-derives a winner.
- **Rounds carry stable ids** (`<gameId>-r<n>` for legacy, unique ids from the store for new ones). Never key anything on a round's index.
- **Every exported function gets a test** in `packages/core/src/core.test.ts`. Run `pnpm --filter @tally/core test`.

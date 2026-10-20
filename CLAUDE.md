# Tally Ho!

A delightful score counter for family game night, and its author's portfolio piece. An installable,
offline PWA: Kate, Blair and Alder sign in and share one live scoreboard; everyone else gets a
playable demo. The original single-file prototype in `docs/imports/` is the reference for feel.

## When goals conflict, in this order
1. **Family data is never lost.** A score entered is a score kept: offline, killed apps, two phones
   at once. Never trade a save for an animation or a faster path.
2. **Game-night speed.** Scoring is instant, one-handed and works with no signal. Never add a step or a
   confirm to scoring a round.
3. **Delight.** Sound, motion and feel faithful to the prototype, in both themes. Never ship a jump,
   a flash or a silent tap where the prototype had joy.
4. **Portfolio polish.** The demo, Storybook and docs read like care went into them.

## Map
- `packages/core`: schemas + pure scoring/stats/samples/migration. `packages/ui`: the design system.
  `packages/app`: store, screens, sheets, sync. `apps/web`: the PWA shell. `apps/storybook`: the docs.
- Read before touching an area (and its path rules in `.claude/rules/` load automatically):
  [docs/GOALS.md](docs/GOALS.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
  [docs/DESIGN.md](docs/DESIGN.md) · [docs/SYNC.md](docs/SYNC.md) · [docs/TESTING.md](docs/TESTING.md)
- Before re-deciding anything: [docs/DECISIONS.md](docs/DECISIONS.md). Before debugging iOS, PWA,
  Storybook or tooling oddities: [docs/LESSONS.md](docs/LESSONS.md). (Audio on iOS has been decided
  three times; read decision and lesson first.)

## Skills (workflows) and reviewers
`.claude/skills/`: **verify** (the gate), **ship** (commit and hand-off), **new-component**,
**visual-check** (screenshots via `node scripts/shoot.mjs`), **storybook-review**, **add-game**,
**sync-change**, **drift-and-align** (audit the harness against the code, realign both:
`pnpm drift`). `.claude/agents/`: **design-reviewer** for UI changes, **sync-reviewer** for anything
touching data. Use them; they encode how this repo checks its own work.

## Definition of done
1. `pnpm format`, then `pnpm lint`, `pnpm typecheck` and `pnpm test` are green.
2. The relevant Playwright suite passes; anything user-facing gets the full **verify** skill
   (`CI=true pnpm e2e` from clean builds) before you say it's done.
3. UI changes: screenshots in both themes (390 and 320 wide) looked at, not assumed. Run
   design-reviewer. Data changes: run sync-reviewer.
4. Report honestly: what ran with its counts, what didn't, what is CI-only (`pnpm test:rules`,
   `pnpm e2e:cloud` need Java; this machine has none). Never claim green without the output.

## Autonomy
- Commit only when the user asks, with the attribution trailer the session provides.
- Never push, deploy or deploy Firestore rules (`git push`, `pnpm deploy`, `vercel`,
  `pnpm firebase:rules`): print the commands for the user. The guard hook enforces this.
- Ports belong to the user (app :3100, Storybook :6116; other repos use others). Never leave a server
  running; tests use :3101/:3103/:3105 and stop their own.
- Generated files (icons, splash screens, the link preview, build output, the lockfile) and `.env*` are off limits:
  regenerate or ask. Hooks format every edited file and block the protected ones.
- No new dependencies without saying so.

## The rules
@CONVENTIONS.md

---
name: drift-and-align
description: Audit how far Tally Ho!'s harness (goals, conventions, path rules, skills, agents, context docs) has drifted from the real code, realign the harness to reality, then bring the code up to the realigned rules, and report. Use after a big feature or a run of quick fixes, before a release, when an agent followed a doc that turned out to be wrong, when the user asks for a drift audit / alignment / "is the documentation still true?", or roughly monthly.
---

# Drift audit and alignment

Four phases, in order: **audit** what's real → **align the harness** to it → **conform the code** to
the aligned harness → **report**. The harness is: `CLAUDE.md`, `AGENTS.md`, `CONVENTIONS.md`,
`.claude/rules/`, `.claude/skills/`, `.claude/agents/`, `.claude/settings.json` + hooks, `docs/*.md`
and `README.md`.

Two kinds of drift, two directions of repair:
- **The harness drifted** (code is right, the doc is stale, missing or dead) → fix the harness (phase 2).
- **The code drifted** (the rule is right, the code breaks it) → fix the code (phase 3).

## Phase 0: baseline (read-only)
1. `git status --short` and `git log --oneline -5`: note a dirty tree; don't mix this work with someone else's uncommitted changes without saying so.
2. `pnpm check:harness`: dead paths, unknown scripts, bad frontmatter, rule globs that match nothing.
3. `node scripts/drift-probes.mjs`: the mechanical rule checks (stories, barrels, raw colours, clock/React in core, `next/*` in packages, lazy Firebase, hard deletes, dead copy/CSS/exports/deps, rule coverage, suppressions, TODOs). Keep its counts: they're the "before".
4. `pnpm lint`, `pnpm typecheck`, `pnpm test`: know whether you start green. If red, report that first; don't align on top of a broken build.

## Phase 1: drift audit (read-only)
Compare every claim the harness makes against the code. A claim is any path, symbol, number,
command, behaviour, timing, label or "always/never" rule.

1. **Fan out** (up to 3 Explore subagents in parallel, each given the harness files for its area and
   told to verify claims, not to fix anything):
   - **Design & UI:** `docs/DESIGN.md`, `.claude/rules/ui.md`, `storybook.md`, the stories vs `packages/ui`, `components.css`, `tokens.css`, `motion.css`, `sfx.ts`.
   - **Data & app:** `docs/ARCHITECTURE.md`, `docs/SYNC.md`, `rules/core.md`, `app.md`, `sync.md` vs `packages/core`, `packages/app`, `firestore.rules`.
   - **Shell, tests & tooling:** `docs/TESTING.md`, `rules/testing.md`, `pwa-web.md`, the skills, `README.md`, `CLAUDE.md` vs `apps/web`, `scripts/`, `e2e/`, `playwright.config.ts`, `package.json`, `.github/workflows/ci.yml`.
2. **Also look the other way:** what does the code do that no doc mentions? New components, screens, scripts, env vars, ports, defaults (e.g. games in `packages/core/src/presets.ts`), storage keys, timings, copy patterns, and any recent fix that encodes a lesson (`git log` since the last audit).
3. **Classify every finding:**

   | Class | Meaning | Repair |
   |---|---|---|
   | `DOC-STALE` | The code is right; the harness says something else | Phase 2 |
   | `GAP` | A real pattern, decision or trap no doc records; code no rule covers | Phase 2 |
   | `DEAD` | The harness describes something that no longer exists | Phase 2 |
   | `CODE-DRIFT` | The rule is right; the code breaks it | Phase 3 |
   | `CONFLICT` | Docs disagree, or it isn't clear whether the doc or the code is right | Ask |

4. **Who's right?** Decide in this order, and say which applied:
   1. The user's latest instruction (in this conversation or a recent commit) beats any doc.
   2. An accepted entry in `docs/DECISIONS.md` beats code that contradicts it, unless the user changed course since (then the decision record is stale: `DOC-STALE`).
   3. Behaviour pinned by a passing test is reality.
   4. The priority order in `docs/GOALS.md` breaks ties (family data > game-night speed > delight > portfolio).
   5. Still unsure → `CONFLICT`.
5. **Write the audit report** (the template under "Report"), findings ranked by GOALS priority.

### Checkpoint
**Stop and ask the user** before phases 2 and 3 if any finding is `CONFLICT`, or if a repair would:
change user-visible behaviour, copy or defaults; touch data, schemas, `firestore.rules` or sync;
delete code or docs; add a dependency; or edit protected files. List those as decisions with a
recommendation each. Everything else (docs that are plainly stale, missing rules for existing
patterns, behaviour-preserving code fixes) proceeds without asking.

## Phase 2: align the harness
1. Fix `DOC-STALE` claims to match the code. Remove `DEAD` ones.
2. Close `GAP`s where they belong (one source of truth: never say it twice):
   - Cross-cutting rule → `CONVENTIONS.md`. Area rule → the matching `.claude/rules/*.md` (add a path glob if code has no rule; remember `**` skips dot-folders, so name them, e.g. `apps/storybook/.storybook/**`).
   - A choice someone could re-litigate → a new numbered entry in `docs/DECISIONS.md` (Context / Decision / Consequences). A trap that cost time → `docs/LESSONS.md` (symptom → cause → fix).
   - A repeated workflow → a skill step (or a new skill). A new review concern → the reviewer agent.
   - Product intent, priorities or non-goals → `docs/GOALS.md` (only with the user's say-so).
3. **Ratchet:** when a rule can be checked mechanically, add a probe to `scripts/drift-probes.mjs`
   (or a test) so the next drift is caught by a machine, not an audit.
4. Sharpen vague rules into checkable ones ("respects reduced motion" → "every animation is a keyframe in `motion.css`, under its kill switch").
5. Keep `CLAUDE.md` short (≈ 80 lines): it's loaded every session. Detail goes in rules and docs.
6. `pnpm check:harness` is green.

## Phase 3: conform the code
1. Fix `CODE-DRIFT` in GOALS priority order: data safety first, then speed, delight, polish.
2. Each fix: the smallest behaviour-preserving change; where possible, first add the test or probe that fails because of the drift, then make it pass.
3. Only make behaviour changes the user approved at the checkpoint.
4. UI changes → **visual-check**, then the **design-reviewer** agent. Data/sync changes → the **sync-change** skill and the **sync-reviewer** agent.
5. Respect the guard: protected files are regenerated (`pnpm icons`) or left to the user; no new dependencies without saying so.

## Phase 4: verify and report
1. Run the **verify** skill (full gate from clean builds).
2. Re-run `node scripts/drift-probes.mjs` and `pnpm check:harness`: the "after".
3. Don't commit unless the user asked (then the **ship** skill). Never push or deploy.

## Report
```
## Drift audit and alignment: <date>

**Baseline:** probes <n> findings · check:harness <ok|n problems> · gate <green|red: …>
**After:** probes <n> · check:harness ok · verify: lint ✓ typecheck ✓ unit <n> ✓ e2e <n> ✓ (CI-only: test:rules, e2e:cloud)

### Findings (<n>)
| # | Class | Where | Finding | Who's right (why) | Resolution |
|---|---|---|---|---|---|
| 1 | CODE-DRIFT | file:line | … | rule (DECISIONS #8) | fixed in <file> + test |
| 2 | DOC-STALE | docs/X.md | … | code (pinned by e2e/…) | doc updated |
| 3 | GAP | … | … | — | new rule in .claude/rules/… |
| 4 | CONFLICT | … | … | needs you | deferred: recommendation … |

### Harness changes
- <file>: <what changed and why>

### Code changes
- <file>: <what changed>, verified by <test/probe>

### Ratchets added
- <probe/test>: now catches <drift> automatically

### Needs your decision
- <question> · recommendation: <…>

### Not run
- <suites that need Java/CI, anything skipped and why>
```
Be honest: counts come from real output, unfixed findings are listed as unfixed, and "aligned"
means `check:harness` and the probes say so, not that it reads well.

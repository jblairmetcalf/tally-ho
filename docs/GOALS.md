# Goals

Who Tally Ho! is for, what matters most when goals pull against each other, and what it deliberately isn't. Read this before any change that trades one quality for another.

## Who it's for

| Audience | Where they meet it | What they need |
|---|---|---|
| **Kate, Blair and Alder** (the family; three members, no more) | At the table, phone in one hand, cards in the other, signed in (family mode) | Scores that are instant, shared across the three phones, never lost, and fun to enter |
| **Portfolio visitors** | The public URL, signed out (demo mode with sample games), plus Storybook and these docs | A polished, delightful app that shows craft: design system, sync, tests, docs |

## Priority order

When goals conflict, the higher one wins. Every time.

| # | Goal | Means | Tie-break example |
|---|---|---|---|
| 1 | **Family data is never lost** | Writes persist on the phone first (`tallyho.v3` / `tallyho.outbox` + `tallyho.family` mirror), sync later; no hard deletes; finished games frozen | Never ship a sync or migration change without a test that proves old data survives; never drop an unconfirmed write to simplify the outbox |
| 2 | **Game-night speed** | Scoring is instant, works offline, one-handed, few taps | Never add a confirm step to scoring a round (confirm only destructive actions, via `ConfirmButton`); never block a save on the network |
| 3 | **Delight** | Sound, motion, haptics and confetti faithful to the prototype `docs/imports/Tally Ho!.html` | Never trade an offline save for an animation; an animation may not delay the next tap |
| 4 | **Portfolio polish** | The demo, Storybook, docs, CI | Never let demo-only polish (samples, Storybook) pull Firebase or extra weight into the family's first paint |

## Quality bar (every change)

- **Both themes:** Dark (the prototype's ink world) and Daylight read well. See [DESIGN.md](DESIGN.md).
- **WCAG AA:** text contrast ≥ 4.5:1 (`-text` tokens for small coloured text); axe has no serious/critical violations (enforced by `e2e/storybook.spec.ts` and `e2e/settings.spec.ts`).
- **Targets ≥ 44px**, keyboard reachable, every icon-only control named.
- **Reduced motion:** the kill switch in `packages/ui/src/styles/motion.css` is respected; confetti skips.
- **Native feel:** no text selection or long-press callouts (inputs opt back in), no double-tap-zoom delay, sticky sheet headers and CTA. See [DESIGN.md](DESIGN.md#native-feel).
- **Offline-first:** the app opens offline after one visit; every score is saved on the phone before anything else.

## Non-goals

- Multiple families, public sign-up or account creation from the app (sign-up is off in the Firebase console).
- More than three accounts.
- Enforcing game rules (the app counts; the table decides). Goals are only race / rounds / "Who won?" / open-ended, optionally lowest-wins; each default is set from its rulebook, but the table still plays the game.
- Server code, Cloud Functions or the Blaze plan. Firebase stays on Spark (no billing account).
- Native apps. It's a PWA, installed from Safari.

## Success signals

- A full game night is scored without anyone waiting on the app, including with no signal.
- No family round has ever gone missing; two phones scoring at once both land.
- Sounds play on a silenced iPhone and hand music back afterwards.
- The family reaches for it instead of paper.
- A portfolio visitor can play the demo, open Storybook and see every component in both themes, and CI is green.

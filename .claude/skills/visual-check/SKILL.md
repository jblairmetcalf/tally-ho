---
name: visual-check
description: Screenshot Tally Ho! Storybook stories (components, sheets and full app screens) in Dark and Daylight at phone widths 390 and 320 with scripts/shoot.mjs, look at the PNGs, and run that story's Playwright checks. Use after any visual change in packages/ui or packages/app, when reviewing a UI diff, or when someone asks "how does it look?".
---

# Visual check

Tests prove a story renders and passes axe; only looking proves it looks right. Do both.

## Steps

1. **Pick the story ids.** An id is the kebab-cased title + `--` + kebab-cased export name: `Scoreboard/StatList` › `Home` → `scoreboard-statlist--home`. App screens and sheets are stories too: `screens-tallyapp--flip-7-race`, `screens-tallyapp--victory`, `sheets-app-sheets--new-game`, `screens-family-sync--…`. To list them:
   ```sh
   node -e "console.log(Object.keys(require('./apps/storybook/storybook-static/index.json').entries).join('\n'))" | grep <area>
   ```
   Choose every story the change can affect, including screens that use the component.
2. **Build Storybook** (always after a code change; the script serves the static build):
   ```sh
   pnpm --filter @tally/storybook build
   ```
3. **Shoot** (defaults: both themes, widths 390 and 320, reduced motion):
   ```sh
   node scripts/shoot.mjs <story-id> [<story-id> …]
   node scripts/shoot.mjs --theme light --width 390 screens-tallyapp--history
   ```
   It prints one PNG path per id × theme × width (`<id>-<theme>-<width>.png`, in the gitignored test-results folder unless `--out` says otherwise) and exits non-zero on a missing build, an unknown id, or page errors.
4. **Read every PNG** with the Read tool. Check:
   - both themes legible; small coloured text uses `-text` tokens (Daylight amber/jade/coral text dark enough);
   - nothing clipped, overlapping or wrapping badly at 320; long names ellipsize or wrap deliberately;
   - targets look ≥ 44px; spacing matches neighbouring components;
   - player colours right (palette slot, not a fixed colour); crowns, pips, race track aligned;
   - sheets: title row, close button, CTA at the bottom; overlay stories show one theme each;
   - matches the prototype (`docs/imports/`) where a counterpart exists.
   Screens are shot at the final frame (reduced motion): animation itself needs a look in `pnpm storybook`.
5. **Run the story checks** (render, axe in both themes, manager/controls):
   ```sh
   pnpm exec playwright test --project=storybook -g "<Title>"
   ```
   e.g. `-g "Scoreboard/StatList"`. For app screens also run the relevant web spec (`pnpm exec playwright test --project=web e2e/game.spec.ts`).
6. Fix, rebuild, reshoot until the shots are right. Don't leave a server running (shoot.mjs stops its own).

## Report template

```
Visual check: <ids>
- shots: <n> PNGs (dark/light × 390/320), read: yes
- findings: <none | id/theme/width → what's wrong → fixed?>
- storybook suite: <p passed / f failed> for "<Title>"
- not checked: <animation timing / real device / …>
```

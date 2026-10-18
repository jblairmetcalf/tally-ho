---
paths:
  - "apps/storybook/**"
  - "**/*.stories.tsx"
---

# Storybook — every component, both themes

Config: `apps/storybook/.storybook/`. Skills: `storybook-review`, `visual-check`.

- **The decorator renders every story in Dark + Daylight side by side** (`apps/storybook/.storybook/preview.tsx`). Don't wrap stories in a `ThemeRoot`.
- **`parameters: { tally: { overlay: true } }`** for anything that covers the viewport (sheets, toasts, victory, fixed nav): one theme, picked in the toolbar.
- **`parameters: { tally: { bare: true } }`** for full screens and foundations pages: the story renders its own `ThemeRoot`. `width` sets the column (default 390).
- **Full-screen stories opt out of Docs** with `tags: ['!autodocs']` (sheets, overlays, screens, foundations). Component stories keep autodocs: their Docs page is the fast review.
- **Cover every meaningful state** with a named export and a one-line JSDoc (it shows on the Docs page): default, empty, long names, many players, disabled, armed/confirm, low-wins, tie.
- **Controls must accept the story's args.** A control fed the wrong type crashes the whole manager UI (a `range` control given a CSS string did). Set `argTypes` to match the prop: `range` 0–7 for palette `color`, `select`/`inline-radio` with `options` for unions. `e2e/storybook-manager.spec.ts` guards this.
- **Colour pickers only for CSS colour props** (`background`, `…Color`; the `controls.matchers` in `preview.tsx`). A bare `color` is a palette slot.
- **Stories are data-deterministic**: use `packages/ui/src/scoreboard/fixtures.ts` (`SAMPLES`, `clock`) or `packages/app/src/fixtures.ts` (`fixedClock`, `SCENARIOS`); never `Date.now()` or `Math.random()`.
- **App stories are silent** and use `demoSession(...)` for session state.
- **Titles follow the sidebar order** in `preview.tsx` `storySort`: Foundations, Brand, Primitives, Scoreboard, Sheets, Screens. New areas go there too.
- **Sidebar/manager config (`apps/storybook/.storybook/manager.ts`, `main.ts`) needs a restart** of `pnpm storybook`; it doesn't hot-reload.
- **Every story must pass axe** (serious/critical, WCAG 2.1 AA) in both themes: `e2e/storybook.spec.ts`. `Foundations/Colour` alone may show low-contrast pairs as data.
- **Rebuild before testing**: the suites read `apps/storybook/storybook-static/index.json`. `pnpm --filter @tally/storybook build`, then `pnpm exec playwright test --project=storybook -g "<Title>"`.
- **Story id** = kebab title + `--` + kebab export name (`Brand/Chip` › `DeadHeat` → `brand-chip--dead-heat`); that's what `node scripts/shoot.mjs` takes.
- **Dev server is :6116** (`pnpm storybook`); if it says `EADDRINUSE`, find the holder with `lsof -iTCP:6116 -sTCP:LISTEN`.

---
name: new-component
description: Add a new presentational component to Tally Ho!'s design system (packages/ui) the right way - tokens and component CSS in both themes, a stories file covering every state with argTypes that match, a barrel export, then a visual check and the Storybook suites. Use when building any new visual piece (button, card, badge, chart, row, overlay) or when a screen needs a look that no existing @tally/ui component gives.
---

# New component

Read `.claude/rules/ui.md` and `.claude/rules/storybook.md` first. Look in Storybook (or `packages/ui/src/*/index.ts`) for something that already does it; extending a component beats a near-duplicate.

## 1. Decide where it lives

| It… | Put it in |
|---|---|
| renders from props only, no store, no copy | `packages/ui/src/<area>/<Name>.tsx` |
| reads the store, `useSession()`, or `COPY` | `packages/app/src/screens/` or `packages/app/src/sheets/`, composed from ui pieces |
| is a full screen or a sheet | `packages/app`, with its look made of ui components |

Areas: `brand/` (identity: chip, fox, icon), `primitives/` (generic controls), `scoreboard/` (game/score displays), `feel/` (sound, haptics, confetti).
If a prototype counterpart exists in `docs/imports/`, port its markup, class names, keyframes and timings.

## 2. The component

- `packages/ui/src/<area>/<Name>.tsx`: named export, typed `<Name>Props` with JSDoc on non-obvious props, a short doc comment on the component.
- Use existing classes from `packages/ui/src/styles/components.css` and Tailwind utilities on tokens (`bg-surface`, `text-muted`, `rounded-card`). Player colours: `paletteVar(i)`. Use `cx` for conditional classes.
- Strings arrive as props (labels, aria-labels). Callbacks for anything that should make a sound; the caller plays it.
- Interactive: a real `<button>`/`<input>`, ≥ 44px target, accessible name, visible focus, keyboard path (`rovingKey` for radio groups).

## 3. Its CSS

Append to `packages/ui/src/styles/components.css`, inside `@layer components`, under a comment naming the component:
- tokens only (`var(--surface)`, `var(--jade-text)`…); if a value differs per theme, add a token to both blocks of `packages/ui/src/styles/tokens.css` instead of a `[data-theme="light"]` patch;
- animation via the keyframes in `packages/ui/src/styles/motion.css` (add new keyframes there; the reduced-motion block covers them automatically);
- no element selectors outside `:where(.tally)`.

## 4. Stories

`packages/ui/src/<area>/<Name>.stories.tsx`:
```tsx
const meta: Meta<typeof Name> = {
  title: '<Area>/<Name>',          // Brand | Primitives | Scoreboard
  component: Name,
  args: { /* a realistic default */ },
  argTypes: { /* one per prop whose inferred control would be wrong */ },
}
```
- One named export per meaningful state, each with a one-line JSDoc: default, empty, long names (16 chars), 2 and 12 players, disabled, armed/confirm, low-wins, tie, loading.
- `argTypes` must match the prop type: `color` (palette slot) → `{ control: { type: 'range', min: 0, max: 7, step: 1 } }`; unions → `select`/`inline-radio` with `options`. Never feed a CSS string to a numeric control: it takes down the whole Storybook UI.
- Overlays: `parameters: { tally: { overlay: true } }` + `tags: ['!autodocs']`.
- Deterministic data from `packages/ui/src/scoreboard/fixtures.ts`.

## 5. Export it

Add `export * from './<Name>'` to the area barrel (`packages/ui/src/primitives/index.ts`, `brand/index.ts`, `scoreboard/index.ts` or `feel/index.ts`), alphabetically. `packages/ui/src/index.ts` already re-exports the barrels.

## 6. Check it

```sh
pnpm exec biome check packages/ui/src/<area>
pnpm typecheck
pnpm --filter @tally/storybook build
```
Then run the `visual-check` skill on the new story ids (both themes, 390 and 320), and:
```sh
pnpm exec playwright test --project=storybook -g "<Area>/<Name>"
```
That covers render errors, axe in both themes, and the manager (controls) check. For a bigger change, ask the `design-reviewer` agent.

## Report template

```
New component: <Area>/<Name> (packages/ui/src/<area>/<Name>.tsx)
- states covered: <list of story names>
- CSS: <n rules appended to components.css; new tokens: …>
- exported from: <barrel>
- visual check: <shots read; issues found/fixed>
- storybook suite: <p passed / f failed> for "<Area>/<Name>"
- typecheck/lint: <pass/fail>
- open questions: <prototype mismatches, copy needed in COPY, …>
```

---
name: storybook-review
description: Walk through Tally Ho!'s Storybook to review the design system or a UI change - how it's organised, keyboard shortcuts to move fast, Docs pages, the theme toolbar, and a checklist of what to look at. Use when the user wants to review components or screens in Storybook, asks how to navigate it, or when the Storybook sidebar/manager config changed.
---

# Storybook review

## Open it

```sh
pnpm storybook          # http://localhost:6116
```
`EADDRINUSE`? Something holds 6116: `lsof -iTCP:6116 -sTCP:LISTEN`, stop it, retry.
Changed `apps/storybook/.storybook/manager.ts` or `main.ts` (sidebar, roots, addons, theme)? **Restart** `pnpm storybook`; the manager doesn't hot-reload. Preview and story edits do.

## How it's organised

Sidebar order (from `apps/storybook/.storybook/preview.tsx`): **Foundations** (Start here, Colour, Type, Shape, Motion, Sound, Haptics, Icons) → **Brand** → **Primitives** → **Scoreboard** → **Sheets** → **Screens**. Roots after Foundations start folded.

- Component stories show **Dark + Daylight side by side** in a 390px column.
- Every component has a **Docs** page: all its states on one scroll with descriptions and controls. Start reviews there.
- Sheets, overlays and screens are full-canvas (no Docs page). Use the toolbar **Theme** menu (Dark + Daylight / Dark / Daylight) to flip overlays.
- The addons panel starts closed: ⌥A opens it (Controls, Actions, Accessibility).

## Shortcuts (Storybook defaults)

| Keys | Does |
|---|---|
| `/` | search stories |
| ⌥ ↑ / ⌥ ↓ | previous / next component |
| ⌥ ← / ⌥ → | previous / next story |
| ⌥ S | hide/show sidebar |
| ⌥ A | hide/show addons panel |
| ⌥ F | full screen canvas |
| ⌥ T | hide/show toolbar |

Direct link to a story: `http://localhost:6116/?path=/story/<id>`; to a Docs page: `?path=/docs/<title-kebab>--docs`.

## What to check

1. **Both themes**: every state readable in Daylight, not just Dark. Small coloured text dark enough on cream.
2. **States**: does the Docs page cover empty, long names, many players, disabled, armed, low-wins, tie? Missing state = missing story.
3. **Accessibility panel** (⌥A → Accessibility): no violations; icon buttons have names.
4. **Controls**: change each control; nothing crashes; values make sense (palette `color` is 0–7).
5. **Motion**: watch entrances once at normal speed (Foundations/Motion lists every keyframe); toggle the OS reduced-motion setting and confirm they stop.
6. **Sound/Haptics**: Foundations/Sound plays every cue; app stories are silent by design.
7. **Screens**: walk `Screens/TallyApp` (first run → race → match point → victory → history) and `Screens/Family sync` against the prototype in `docs/imports/`.
8. **Phone width**: shrink the browser or use `node scripts/shoot.mjs --width 320 <id>` (skill `visual-check`).

Design intent to check against: docs/DESIGN.md.

## Report template

```
Storybook review: <scope>
- reviewed: <titles / Docs pages>
- blockers: <story → issue>
- should fix: <…>
- nits: <…>
- missing states: <component → state>
```

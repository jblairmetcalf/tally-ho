# Agents: start here

This repo's instructions live in one place so every tool reads the same thing.

1. **[CLAUDE.md](CLAUDE.md)**: what Tally Ho! is, the priority order when goals conflict, the map,
   the definition of done, and what you may and may not do on your own (never push or deploy).
2. **[CONVENTIONS.md](CONVENTIONS.md)**: the rules for every change.
3. **Area rules** in [.claude/rules/](.claude/rules/): read the file for the area you're touching
   (`ui.md`, `core.md`, `app.md`, `sync.md`, `testing.md`, `storybook.md`, `pwa-web.md`). Each lists
   the paths it covers at the top.
4. **Context** in [docs/](docs/README.md): goals, architecture, design, the sync contract, testing,
   past decisions and hard-won lessons.
5. **Workflows** in [.claude/skills/](.claude/skills/): step-by-step recipes (verify, ship,
   new-component, visual-check, storybook-review, add-game, sync-change, drift-and-align). Follow them even if your
   tool doesn't run skills natively.

Check your work the way the definition of done says, and report what actually ran.

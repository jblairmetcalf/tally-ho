---
paths:
  - "packages/app/**"
---

# packages/app — store, screens, sheets

Context: CONVENTIONS.md, docs/ARCHITECTURE.md, docs/SYNC.md. Sync internals: `.claude/rules/sync.md`.

- **The store mirrors the prototype's `App`.** Same transitions, same order, same timings: 250ms (banner after a round/start), 500ms (victory after a finish), 700ms (lead-change / match-point cue), 1500ms (samples-cleared toast); toast 2600ms, banner 1400ms. Check `docs/imports/` before changing any.
- **Side effects go through `Effects`** (`packages/app/src/effects.ts`): `fx.play`, `fx.later`, `fx.timer`, `fx.burstFrom`. Never `setTimeout` or `SFX.x()` directly in the store: tests and stories run the same logic silently and `dispose()` must cancel everything.
- **Sounds are played by the store or screens**, never inside `@tally/ui` components (they take callbacks). Haptics ride on cues via `FELT` in `effects.ts`.
- **Every user-facing string is in `packages/app/src/copy.ts`** (`COPY`). Prototype strings are verbatim; new ones match its voice. e2e selects by these labels, so a copy change is a test change.
- **Screens never branch on mode.** The store and screens see one `DataProvider`. `useSession()` is only for sign-in UI, Settings › Family and the Home badge (`SyncBadge` / Demo pill).
- **Remote changes arrive via `replaceData`**: a remote round flashes only; a remote finish shows victory if watching, else a toast; a remote discard goes home with a toast. Toasts and ribbons belong to the phone that scored. Echoes of our own writes must be no-ops.
- **Persist through the provider** (`packages/app/src/provider.ts`): `memoryProvider` for tests/stories, `localProvider` for demo, `createCloudProvider` for family. The store subscribes and saves; nothing else touches storage keys.
- **Inject the clock.** `createTallyStore(provider, clock)`; tests and stories use `fixedClock` / `SCENARIOS` from `packages/app/src/fixtures.ts`.
- **No `next/*`** here; `apps/web` only composes. No bespoke visuals: compose `@tally/ui` components and classes. If you need a new look, it's a ui component first (skill `new-component`).
- **Sheets are routed in `SheetHost`** (`packages/app/src/TallyApp.tsx`) from a `SheetSpec`. Add a spec type, a `COPY.sheetLabel` entry and a route together. One sheet at a time: somewhere deeper inside a sheet (an area, an editor) is a page pushed on that sheet's `SheetNav` stack, never a nested `<Sheet>`. See `SettingsSheet`: a `Route[]` stack, `go` plays `open`, back plays `close`, archive/delete/add pop silently; page content has no `SheetTitle` (the nav header titles it).
- **Never hard-delete a game or player** from an action: games go through `deleteGame` (sync soft-deletes), players are `archived`.
- **Round ids come from `submitRound`** (unique across phones). Never index into rounds by position for identity.
- **Stories for screens and sheets** live in `packages/app/src/*.stories.tsx` with `parameters: { tally: { bare: true } }` or `overlay: true`, `tags: ['!autodocs']`, and `demoSession(...)` for session state.
- **Tests**: store logic in `packages/app/src/store.test.ts` (fake timers + `fixedClock`); sync under `packages/app/src/sync/`. Run `pnpm --filter @tally/app test`.
- **Keep `TallyApp` props working** (`provider`, `store`, `embedded`, `silent`, `initialUi`, `session`): stories and tests depend on them.

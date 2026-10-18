# Architecture

How the code is laid out, how data flows from a tap to localStorage or Firestore, and how the PWA is built and shipped. Read this before touching the store, a provider, the service worker or the build.

## Package graph

```
                 packages/core      Zod schemas, scoring, stats, samples, migrate (no React, no clock)
                       │
                 packages/ui        tokens, motion, feel (SFX/Haptics/FX), brand, components
                       │
                 packages/app       zustand store, DataProvider, sync/, screens, sheets, copy
                  ╱          ╲
          apps/web          apps/storybook
   Next static-export PWA    design-system docs (also loads ui + app stories)
```

Packages are consumed as TypeScript source (`exports: ./src/index.ts`); there is no package build step. Rules for each layer are in [CONVENTIONS.md](../CONVENTIONS.md#shape).

## What lives where

| Path | Holds |
|---|---|
| `packages/core/src/schemas.ts` | `Store`, `Game`, `Round`, `Player`, `Preset`, `Prefs` (Zod; source of truth) |
| `packages/core/src/scoring.ts`, `stats.ts` | Pure scoring (totals, leader, end conditions for the four goals `score` / `rounds` / `wins` / `open`, tiebreak, match point, `goalLabel`, `winRound`, `targetFor`) and stats |
| `packages/core/src/presets.ts` | `DEFAULT_PRESETS` (each set from its rulebook: [decision 16](DECISIONS.md)), `DEFAULT_PLAYERS`, `DEFAULT_PREFS`, `emptyStore()` |
| `packages/core/src/samples.ts` | Deterministic sample history for the demo (`freshStore`) |
| `packages/core/src/migrate.ts` | Prototype `tallyho.v2` → v3, `withRoundIds` |
| `packages/ui/src/styles/` | `tokens.css`, `motion.css`, `components.css` |
| `packages/ui/src/feel/` | `sfx.ts`, `haptics.ts`, `confetti.ts`, `FxCanvas.tsx` |
| `packages/ui/src/{brand,primitives,scoreboard,theme}/` | Components, each with `<Name>.stories.tsx` |
| `packages/app/src/store.ts` | `createTallyStore`: data + UI state + every action |
| `packages/app/src/effects.ts` | Sounds, haptics, confetti, timers the store triggers (silenceable) |
| `packages/app/src/provider.ts` | The `DataProvider` seam, `createLocalProvider`, `memoryProvider` |
| `packages/app/src/sync/` | Family mode: session, cloud provider, diff, outbox, Firebase loader, fake Firestore |
| `packages/app/src/TallyApp.tsx` | Root: session → keyed store → shell, sheets, toasts, victory |
| `packages/app/src/copy.ts` | Every user-facing string |
| `apps/web/app/` | `layout.tsx` (fonts, theme boot script), `page.tsx`, `manifest.ts`, `splash.ts`, `sw-register.tsx` |
| `apps/web/public/sw.js` | The service worker (template; rewritten at build) |
| `apps/storybook/.storybook/` | `main.ts`, `preview.tsx` (both-themes decorator), `manager.ts` |
| `apps/storybook/src/foundations/` | Colour, Type, Shape, Motion, Sound, Haptics, Icons pages |
| `scripts/` | `sw-precache.mjs`, `vercel-output.mjs`, `serve.mjs`, `icons.ts`, `shoot.mjs` |

## Data flow

```
 tap ─▶ store action (store.ts) ─▶ set({data}) ─▶ store.subscribe ─▶ provider.save(data)
                     ▲                                                     │
                     │ replaceData(next)                                   ▼
          provider.subscribe(cb) ◀──────────────── DataProvider (provider.ts)
                                                     │                 │
                                   demo: localProvider          family: cloudProvider (sync/)
                                   localStorage tallyho.v3      diff(prev,next) ─▶ outbox (tallyho.outbox)
                                   (migrates tallyho.v2)          ─▶ Firestore (persistentLocalCache)
                                   'storage' event = other tab    snapshots ─▶ Store ─▶ mirror (tallyho.family)
```

- **Store** (`packages/app/src/store.ts`): one zustand store per session holding `data` (the persisted `Store`) and UI state (`screen`, `sheet`, `toast`, `banner`, `flash`, `victory`, `finished`). Every data change is saved through the provider unless it came from the provider (the `remote` flag stops echoes).
- **Seam** (`DataProvider` in `packages/app/src/provider.ts`): `load()` (sync), `save(s)` (may debounce), optional `subscribe(cb)`. Screens and the store never know which provider they have.
- **Demo:** `createLocalProvider()` writes `tallyho.v3`, debounced 150 ms, flushed on `pagehide`/hidden. First launch after the prototype migrates `tallyho.v2` once (old key kept as a backup).
- **Family:** `createCloudProvider()` (`packages/app/src/sync/cloudProvider.ts`):
  - `load()` is synchronous from the mirror `tallyho.family` (instant, offline first paint).
  - `save` → `diff()` (`sync/diff.ts`) turns the change into fine-grained ops (a new round is one `rounds.<id>` field write).
  - Each op is appended to the persisted outbox (`sync/outbox.ts`, key `tallyho.outbox`) **before** it is sent, and leaves only when Firestore confirms or refuses it for good. A phone killed before the SDK loads replays it next launch.
  - Firestore runs with `persistentLocalCache` (IndexedDB), so it also queues offline.
  - Snapshots of `players`, `presets`, `games` are assembled into a `Store` (prefs and `lastPlayerIds` stay local) and passed to subscribers, skipping ones that say nothing new.
  - `watchStatus` feeds the `SyncBadge`; `onRejected` reports writes the rules refused (`TallyApp` hands them to `reactToRejection`: a refused new game → `gameRefused`, else toast `COPY.toast.syncRejected`).
- **Session** (`sync/session.ts`): `createSessionCore` / `useSessionController` picks the mode. The `tallyho.session` flag boots straight into family mode from the mirror, then loads Firebase and verifies auth and `members/{email}`. `Root` in `TallyApp.tsx` keys the app on mode + email + provider, so sign-in/out swaps in a fresh store.
- **Firebase is lazy:** `sync/firebase.ts` uses dynamic `import()`; demo mode never loads it.
- **Remote reactions** (`replaceData` in `store.ts`): a remote round on the live game → `flash` only; a remote win → victory if watching, else a toast (`wonElsewhere`); a remote discard → home + toast (`endedElsewhere`, 400ms later, skipped for a game this phone was refused).
- **Defaults** (`DEFAULT_PRESETS`) seed new stores only; `restoreDefaultGames` (Settings › Games) brings an existing demo or family record up to date.

The full contract (document shapes, rules, session API, labels) is [SYNC.md](SYNC.md).

## PWA

| Piece | Where | Notes |
|---|---|---|
| Static export | `apps/web/next.config.ts` | `output: 'export'`; `distDir` (= the export folder) from `TALLY_DIST_DIR`, default `out` |
| No theme flash | `THEME_BOOT` in `apps/web/app/layout.tsx` | Inline script reads `tallyho.v3` prefs before first paint, sets `data-theme` and the theme-color meta |
| Service worker | `apps/web/public/sw.js`, registered by `apps/web/app/sw-register.tsx` (production only) | Navigations network-first (last good copy, else a themed offline page); static files cache-first; precaches everything on install, `skipWaiting` + `clients.claim` |
| Precache list | `scripts/sw-precache.mjs` (runs after `next build`) | Fills `PRECACHE` and `VERSION` (build hash); **excludes Firebase chunks**, which cache on first sign-in |
| Manifest, icons, splash | `apps/web/app/manifest.ts`, `apps/web/app/splash.ts`, `scripts/icons.ts` | `pnpm icons` regenerates from `docs/imports/tally-ho.png` |

## Build and deploy

| Command | Does |
|---|---|
| `pnpm build` | turbo build: the web export (+ sw-precache) and Storybook |
| `pnpm deploy` | Web build → `scripts/vercel-output.mjs` packages it as Build Output API v3 in the project's `.vercel/output` (with `sw.js` served `max-age=0`) → `vercel deploy --prebuilt --prod`. Vercel builds nothing |
| `pnpm deploy:storybook` | Same for Storybook |
| `pnpm firebase:rules` | Deploys `firestore.rules` |

Firebase config is baked in at build time from `NEXT_PUBLIC_FIREBASE_*` in the web app's `.env.local` (see `apps/web/.env.example`); no config means a demo-only build with sign-in hidden.

## Ports

| Port | What |
|---|---|
| 3100 | `pnpm dev` |
| 6116 | `pnpm storybook` |
| 3101 / 3103 / 3105 | Playwright: web build / Storybook build / cloud build |
| 9099 / 8080 | Auth / Firestore emulators (`firebase.json`) |

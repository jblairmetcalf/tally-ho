---
paths:
  - "apps/web/**"
  - "scripts/**"
---

# apps/web and scripts — the PWA shell and tooling

Context: README.md ("Ship it"), docs/ARCHITECTURE.md.

- **`apps/web` only composes.** No business logic or bespoke components: those belong in `@tally/app` / `@tally/ui`.
- **Static export** (`output: 'export'` in `apps/web/next.config.ts`). No server routes, no runtime env, no `next/image` optimisation. Firebase config is `NEXT_PUBLIC_*`, baked in at build.
- **The boot theme script (`THEME_BOOT` in `apps/web/app/layout.tsx`) must mirror `useThemePref`** (`packages/app/src/hooks.ts`) and `THEME_COLOR` (`packages/ui/src/theme/ThemeRoot.tsx`): same storage key, same system fallback, same theme-color values. Otherwise Daylight phones flash dark; `e2e/pwa.spec.ts` checks.
- **The service worker is `apps/web/public/sw.js` with placeholders** (`VERSION`, `PRECACHE`) that `scripts/sw-precache.mjs` fills after `next build`. Don't hand-edit the built copy, and keep the placeholders intact.
- **The precache excludes Firebase chunks** (they're fetched on first sign-in, then cached). Any change that pulls Firebase into the first-paint chunks defeats it.
- **`sw.js` must be served uncached** (the route in `scripts/vercel-output.mjs`) or installed phones never see updates.
- **Icons and splash screens come only from `pnpm icons`** (`scripts/icons.ts`, from `docs/imports/tally-ho.png`; sizes in `apps/web/app/splash.ts`). Never edit `apps/web/public/icon-*`, `maskable-*`, `apple-touch-icon.png`, `favicon.*` or `splash-*` by hand.
- **The link preview** (what iMessage, Slack and WhatsApp show for the URL) is `apps/web/public/og.jpg` from `pnpm og` (`scripts/og.ts`, drawn in Chromium with the brand fonts; needs the network), plus the `openGraph` / `twitter` metadata in `apps/web/app/layout.tsx`. Keep the card's words and the meta text in step. Scrapers need absolute URLs: `metadataBase` is `NEXT_PUBLIC_SITE_URL`, defaulting to the production URL. Keep the image under ~300 KB (WhatsApp skips bigger ones). It isn't precached. `e2e/pwa.spec.ts` checks the tags.
- **Deploys are prebuilt**: `pnpm deploy` builds locally, `scripts/vercel-output.mjs` packages it, `vercel deploy --prebuilt --prod` uploads it. Vercel builds nothing. Deploying is the user's call: print the command, don't run it.
- **`TALLY_DIST_DIR`** sends the export to `out-cloud` for the emulator e2e; build-phase only. Don't hardcode `out` elsewhere.
- **Scripts are Node ESM run from the repo root** (`node scripts/<name>.mjs`, `tsx scripts/icons.ts`), with a header comment giving usage. They must pass `pnpm lint` (Biome).
- **`scripts/serve.mjs` is the static server for tests**; `scripts/shoot.mjs` reuses its logic on a free port and always closes it.
- **Ports**: 3100 dev, 6116 storybook, 3101/3103/3105 test builds. Keep them distinct so a test never hits a dev server.
- **Viewport is `viewportFit: 'cover'`, status bar `black-translucent`**: layouts must respect `env(safe-area-inset-*)`.
- **No new dependencies** in `apps/web` without saying so.

# Tally Ho!

A score counter for family game night. Pick a game, deal in, and tap in scores each round. The fox keeps the tally, calls the lead changes, and crowns the winner with confetti and a fanfare.

It's an installable, offline PWA. Scores live on the phone.

## What's in the box
- **Scoreboard:** race-to-a-score games (with a race track to the finish line), fixed-round games (with round pips) and open-ended games. Ties at the end trigger a tiebreak round. Games where the **lowest score wins** (Hearts, Golf, Skyjo) count down to a bust line instead.
- **Feel:**
  - a synthesised sound cue for every action (no audio files)
  - suit-shaped confetti
  - rolling score totals, crowns that drop in, and score changes that float up
  - haptics, including a tick on iOS 18+
  - the screen stays awake during a game
- **Record:** family champion, win streaks, standings, a wins-over-time chart, and a filterable history with rematch.
- **Yours to edit:** players (names and chip colours) and game presets. Choose Dark, Daylight or System theme.

## Run it
```sh
pnpm install
pnpm dev          # the app on http://localhost:3100
pnpm storybook    # the design system on http://localhost:6116
pnpm test         # core + store logic (vitest)
pnpm e2e          # Playwright on an iPhone 14 viewport
pnpm build        # static export in apps/web/out
pnpm icons        # regenerate icons + iOS splash screens from docs/imports/tally-ho.png
pnpm deploy       # build and ship the app to its Vercel production URL
pnpm deploy:storybook
```

`pnpm e2e` runs two suites against static builds: **web** (gameplay, settings, offline after one visit, prototype-data migration, no theme flash, axe) and **storybook** (every story in both themes: renders cleanly with no serious axe violations).

## Ship it

### 1. Push to GitHub
The repo is `github.com/jblairmetcalf/tally-ho`, on branch `main`.
```sh
pnpm lint && pnpm typecheck && pnpm test   # optional: the same checks CI runs first
git add -A
git commit -m "What changed"
git push
```
Each push to `main` (and each pull request) runs **CI** (`.github/workflows/ci.yml`) in two jobs:
1. Lint, typecheck and unit tests.
2. The Playwright suites: the app, plus every Storybook story in both themes.

Results are under the repo's **Actions** tab. A failed run uploads its Playwright traces as an artifact. To open one: `pnpm exec playwright show-trace <trace.zip>`.

### 2. Deploy to Vercel
`pnpm deploy` builds the static app on your machine and uploads it to Vercel's **production** URL with `vercel deploy --prebuilt --prod`. Vercel builds nothing, so what ships is exactly what you built.

**One-time setup:**
```sh
npx vercel login                       # opens the browser
npx vercel link --cwd apps/web         # Set up? Yes · your account · existing project? No · name: tally-ho
npx vercel link --cwd apps/storybook   # optional: a separate project for Storybook
```
The links are saved in `apps/web/.vercel` and `apps/storybook/.vercel`. Both are gitignored, and later builds don't touch them.

**Every release:**
```sh
pnpm deploy             # the app → https://<your-project>.vercel.app
pnpm deploy:storybook   # optional: the design system
```

### 3. Install on iPhone
1. Open the **production** URL in Safari. Don't use a preview URL: an installed web app is tied to the address it was installed from, and preview URLs change on every deploy.
2. Tap **Share**, then **Add to Home Screen**.
3. Open it once while online. That caches the whole app, so it works offline from then on.

### 4. Updates
After `pnpm deploy`, swipe Tally Ho! closed and reopen it. The app checks the network for a new version each time it opens, and `sw.js` is served uncached, so the update arrives right away. Scores live on the phone and are kept across updates.

### Troubleshooting
- **`No existing credentials found`:** run `npx vercel login`, then `pnpm deploy` again.
- **Vercel asks to set up a project on every deploy:** run `npx vercel link --cwd apps/web` once.
- **The phone shows an old version:** close and reopen the app. If it's still stale, delete it from the Home Screen and add it again from the production URL. Deleting it also erases its scores.
- **No sound on iPhone:**
  - Check that the speaker button in the Home header is lit.
  - Turn the volume up.
  - Turn off the Ring/Silent switch. Tally Ho!'s sounds mix with your music instead of stopping it, and iOS mutes every mixing app on silent (native games too).
- **`pnpm storybook` fails with `EADDRINUSE`:** something else is already on port 6116. Find it with `lsof -iTCP:6116 -sTCP:LISTEN` and stop it.

## Layout
| Path | What |
|---|---|
| `apps/web` | Next.js static-export PWA shell: manifest, service worker, icons |
| `apps/storybook` | Design-system docs. Every story renders in Dark and Daylight side by side |
| `packages/core` | Zod schemas and pure scoring, stats, samples and migration logic (tested) |
| `packages/ui` | Tokens, keyframes, sound, confetti, haptics, the fox, and every component |
| `packages/app` | The store, the storage seam (`DataProvider`), screens and sheets |
| `docs/imports` | The original single-file prototype and app icon this was built from |

Read [CONVENTIONS.md](CONVENTIONS.md) before changing anything.

## Storage
Everything is saved on the device in `localStorage` behind a small `DataProvider` interface (`packages/app/src/provider.ts`). Data saved by the original prototype (`tallyho.v2`) is migrated on first launch. To sync across phones later, implement the same interface over Firebase (or anything else); nothing else needs to change.

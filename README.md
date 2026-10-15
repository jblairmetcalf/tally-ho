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

## Deploy (Vercel)
Deploys upload the locally built static files (`vercel deploy --prebuilt`); nothing is built on Vercel. One-time setup:
```sh
npx vercel login
npx vercel link --cwd apps/web          # create/link the "tally-ho" project
npx vercel link --cwd apps/storybook    # optional: a separate project for Storybook
```
Then `pnpm deploy`. It always goes to the **production** URL: an installed PWA is tied to the address it was installed from, so install it from that URL and every deploy reaches the phone. `sw.js` is served uncached so updates are noticed.

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

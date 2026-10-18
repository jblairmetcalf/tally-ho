# Tally Ho!

A score counter for family game night. Pick a game, deal in, and tap in scores each round. The fox keeps the tally, calls the lead changes, and crowns the winner with confetti and a fanfare.

It's an installable, offline PWA. Anyone can try it in **demo** mode (scores live on that phone). The family signs in to share one scoreboard across their phones (see [Family sync](#family-sync-firebase)).

## What's in the box
- **Scoreboard:** every game ends the way its rulebook says: race-to-a-score games (with a race track to the finish line), fixed-round games (with round pips; one round per player, or a single final tally), **Who won?** games where you just tap the winner (one game, or first to N wins) and open-ended games. Ties at the end trigger a tiebreak round, or you pick the winner by the game's own tiebreak. Any score or rounds game can be set so the **lowest score wins** (Hearts, Golf, Skyjo…), counting down to a bust line instead.
- **Feel:**
  - a synthesised sound cue for every action (no audio files), audible even with the iPhone on silent
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
pnpm test:rules   # firestore.rules against the Firestore emulator (needs Java)
pnpm e2e:cloud    # family sync end to end against the Auth + Firestore emulators (needs Java)
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
Each push to `main` (and each pull request) runs **CI** (`.github/workflows/ci.yml`) in three jobs:
1. Lint, typecheck and unit tests.
2. The Playwright suites: the app, plus every Storybook story in both themes.
3. Family sync: the Firestore rules tests and the cloud e2e, against the Firebase emulators (CI installs Java for them).

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
  - Sounds play even with the Ring/Silent switch on. iOS makes web apps choose between that and mixing with other apps' audio, so music from another app pauses while Tally Ho! makes sounds. Tally Ho! hands the audio back after 6 seconds of quiet, and the sound button turns it off completely.
- **`pnpm storybook` fails with `EADDRINUSE`:** something else is already on port 6116. Find it with `lsof -iTCP:6116 -sTCP:LISTEN` and stop it.

## Family sync (Firebase)
Signed out, Tally Ho! is a **demo**: sample games, saved on that phone only. Kate, Blair and Alder sign in (Settings → **Family sign in**) and share one live scoreboard through Firebase: Firestore holds the games, Firebase Auth checks who's who, and `firestore.rules` lets only family members in. The rest of the world can install the app and play with the demo, but can't see or touch the family's games.

### One-time setup (Blair)
1. **Create the project.** At [console.firebase.google.com](https://console.firebase.google.com) → *Create a project* (e.g. `tally-ho`). Skip Google Analytics. Stay on the free **Spark** plan.
2. **Firestore.** *Build → Firestore Database → Create database*, pick a region near home, start in **production mode** (everything locked until our rules are deployed).
3. **Sign-in.** *Build → Authentication → Get started → Sign-in method → Email/Password → Enable* (leave "Email link" off). Then *Authentication → Settings → User actions* and **untick "Enable create (sign-up)"**, so nobody can make an account from the app.
4. **Add the family.** *Authentication → Users → Add user* three times: Kate, Blair and Alder, each with their email and a password.
5. **Say who's family.** In *Firestore → Data*, start a collection `members` and add one document per person. The **document ID is their email in lowercase**:
   | Document ID | `name` (string) | `playerId` (string) |
   |---|---|---|
   | `kate@…` | `Kate` | `kate` |
   | `blair@…` | `Blair` | `blair` |
   | `alder@…` | `Alder` | `alder` |

   `playerId` ties the person to their player chip, so rounds they score are marked as theirs. Only the console can write `members`; the app can only read your own.
6. **Register the web app.** *Project settings (gear) → General → Your apps → Web (`</>`)*, name it `Tally Ho!`, no Hosting. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in `apiKey`, `authDomain`, `projectId` and `appId` from the config it shows. These identify the project; they aren't secrets (the rules guard the data), but `.env.local` stays out of git anyway.
7. **Point the CLI at your project.** If your project ID isn't `tally-ho`, change `default` in `.firebaserc`. Then:
   ```sh
   npx firebase-tools login   # opens the browser
   pnpm firebase:rules        # deploys firestore.rules
   pnpm deploy                # builds with .env.local and ships to Vercel
   ```
8. **Sign in on each phone:** Settings → Family sign in. The first family sign-in sets up the players and game presets.

Re-run `pnpm firebase:rules` whenever `firestore.rules` changes, and `pnpm deploy` whenever `.env.local` does (the config is baked into the build).

### Why Spark (the free plan)
Spark has **no billing account**, so there's nothing to charge: if usage ever passed the free quota, Firestore would stop answering for the rest of the day, not send a bill. One family's game nights use a tiny fraction of the free reads, writes and storage. Don't upgrade to Blaze unless you set a budget alert first.

### How offline works
- The app shell is cached by the service worker, so Tally Ho! opens with no signal.
- Signed-in phones keep a copy of the family's data in Firestore's offline cache (IndexedDB). Scores entered offline are saved on the phone straight away and sent when it's back online; the Home badge shows **Offline · saved on this phone** or **Saved on this phone · syncing** until then, and **Synced** after.
- Rounds are stored by id, so two phones scoring the same game at once both land.
- Signing in needs the internet once. After that the phone stays signed in, online or not.
- A game that's already been won can't take late rounds: if an offline phone scores into a game another phone has finished, Firestore refuses it and the phone says so.
- Signing out wipes the family data from that phone and returns it to the demo.

### Testing it locally
`pnpm test:rules` and `pnpm e2e:cloud` run against the Firebase emulators (project `demo-tally`, nothing touches the real project). The emulators need Java 21+ (`brew install --cask temurin`); without it, run them in CI. The rules tests skip themselves under plain `pnpm test`.

### Troubleshooting
- **"This scoreboard is just for the family."** The account exists but has no `members` doc, or the doc ID isn't the email in **lowercase**. Fix it in Firestore → Data.
- **"That email and password don't match."** Check the user in Authentication → Users; *Reset password* from there, or use **Forgot password?** on the sign-in sheet.
- **No "Family sign in" button.** The build had no Firebase config: check `apps/web/.env.local`, then `pnpm deploy` again.
- **`Missing or insufficient permissions` / writes refused.** The rules aren't deployed (`pnpm firebase:rules`), or the `members` doc is missing.
- **`firebase: command not found` / not logged in.** Use `npx firebase-tools login`; `pnpm firebase:rules` uses the copy installed in the repo.
- **Badge stuck on "Saved on this phone · syncing".** The phone is online but can't reach Firestore. Close and reopen the app; pending scores are kept.
- **A brand-new phone shows nothing while offline.** It hasn't synced yet: open it online once after signing in.

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
Everything goes through a small `DataProvider` interface (`packages/app/src/provider.ts`). In demo mode it's `localStorage` (`tallyho.v3`); data saved by the original prototype (`tallyho.v2`) is migrated on first launch. Signed in, it's Firestore with its offline cache (`packages/app/src/sync`). The store and screens don't know which one they have. The sync contract is [docs/SYNC.md](docs/SYNC.md).

# Build your own Tally Ho! with one prompt

Tally Ho! is a family scoreboard for game night: an installable, offline web app (PWA) with sound, haptics and confetti, two themes, a design system in Storybook, and an optional shared live scoreboard for a few family members. Everyone else gets a playable demo.

It was built in one long conversation with Claude Code. This page is that conversation turned into **one prompt**, so you can build your own: your app name, your family, your games. It includes everything the first build had to learn the hard way.

The prompt asks the agent to **ask you questions first**, write **one plan** for you to approve, check its own plan for gaps, and then build in phases, checking each phase before moving on.

---

## What you need

| | Why | Required? |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) (or another coding agent with plan mode) | Runs the prompt | Yes |
| Node 20+ and pnpm (`corepack enable`) | The monorepo | Yes |
| Git and a GitHub repo | CI runs on every push | Yes |
| A [Vercel](https://vercel.com) account (free) | Hosting | Yes, to put it online |
| A [Firebase](https://firebase.google.com) project on the free Spark plan | Family sync. Skip it and you get a demo-only app. | Optional |
| Java 21+ | Only for the Firebase emulator tests. CI can run them for you. | Optional |
| An iPhone or Android phone | To install it and hear it | Recommended |

**A reference design, if you have one.** Tally Ho! was ported from a single-file HTML prototype and an app icon (`docs/imports/` in this repo). If you have your own prototype, mockup or icon, put it in `docs/imports/` first. If you don't, the prompt tells the agent to propose a look and show it to you before building.

---

## How to run it

1. **Make an empty folder** and `git init` it. Put your reference files, if any, in `docs/imports/`.
2. **Fill in the blanks** in the prompt below (the `{{…}}` placeholders). The table under the prompt explains each one. You can also leave any of them in, and the agent will ask you.
3. **Open Claude Code in that folder and switch to plan mode** (Shift+Tab until it says *plan mode*). That way it researches and asks before it writes any code.
4. **Paste the prompt.** Answer its questions. Shorter answers are fine, and "you decide" is a valid answer.
5. **Read the plan and approve it**, or ask for changes. The plan should end with a SWOT and a gap list it has already addressed.
6. **Let it build.** It works in phases, and at the end of each one it runs checks and shows you screenshots. Expect to answer a few more questions along the way.
7. **Ship it** with the commands under [Ship and update](#ship-and-update). The agent prints them; by design, it never pushes or deploys for you.

A full build is long. Let it run, and say "continue" if it stops at a usage limit.

---

## The prompt

Copy everything inside the block.

````text
Build "{{APP_NAME}}": a delightful score counter for family game night, installable as an offline PWA,
with its own design system and Storybook. It's also a portfolio piece, so the demo, Storybook and
docs should read like care went into them.

Before writing any code:
1. Read everything in docs/imports/ (if anything is there). It's the reference for look, copy, sounds,
   timings and feel. Port it faithfully; deviate only on purpose (accessibility, native feel) and
   record why.
2. Ask me questions to spot and fill gaps, in batches of at most 4, with a recommended answer first.
   At minimum: who signs in, which games ship as defaults, how each one ends, the look (if there's no
   reference), the maker's name and link, whether to set up family sync now or later, and anything
   in this prompt that looks wrong for my situation.
3. Write ONE plan: phases, files, decisions, and how each phase is verified. Then do a SWOT and a gap
   analysis of your own plan and fold the fixes in before showing it to me. Go as fast as possible
   once I approve; use parallel sub-agents for independent work, and integrate and verify their output
   yourself.

## Who and what
- Family members who sign in and share one live scoreboard: {{FAMILY_NAMES}} (only these people,
  by email + password). Everyone else, and anyone signed out, gets a playable demo with sample
  history, stored on their phone only.
- Default games and how each ends: {{GAMES}}. Research each game's official rulebook (current
  edition) and pick its ending honestly (see "How a game ends"), then let my answers override the
  rulebook where the family plays differently. Record both in docs/DECISIONS.md.
- Some games only work with certain numbers of players (a two-player game, three or more): each game
  carries optional fewest / most players (2–12, most may be "no limit"), editable in Settings and
  enforced in New game. A game with no limit set falls back to its built-in default.
- Maker credit: {{MAKER_NAME}} at {{MAKER_URL}} (a "Say hi" page links there; no email).

## Priorities, in order (they break every tie)
1. Family data is never lost: offline, killed apps, two phones scoring at once.
2. Game-night speed: scoring is instant and one-handed; never add a step or a confirm to scoring.
3. Delight: sound, motion, confetti and haptics in both themes; never a silent tap where joy belongs.
4. Portfolio polish.

## Stack
A turbo monorepo (pnpm-workspace.yaml), packages consumed as TypeScript source (no build step):
- packages/core: Zod schemas (the source of truth; types are z.infer), pure scoring/stats/samples/
  migration. No React, no DOM, never reads the wall clock (inject a Clock), seeded rng only.
- packages/ui: the design system. Tokens (CSS variables, Dark + Daylight), Tailwind v4, components,
  sound (Web Audio synth, no audio files), haptics, confetti, brand art. No store, no next/*.
- packages/app: zustand store, a DataProvider seam (memory / localStorage / Firestore), effects,
  screens, sheets, sync, and all user-facing copy in one copy.ts.
- apps/web: Next.js 15 static export (output: 'export') PWA shell that only composes.
- apps/storybook: Storybook 8 (react-vite).
- Biome (lint + format), Vitest, Playwright (iPhone 14 device for the app; every story in both themes
  with axe), Radix Dialog as the one overlay primitive, Firebase (lazily loaded) for family sync,
  `uqr` for QR codes. Say so before adding any other dependency.

## How a game ends (goal enum: score | rounds | wins | open)
- score: race to a target (optional "lowest wins", where the target becomes a bust line). A tie at
  the top offers "pick the winner by the game's tiebreak" or one more round.
- rounds: a fixed number of rounds (1 = a single final tally; optionally one round per player, with
  the count following the line-up).
- wins ("Who won?"): each round you tap the winner; first to N wins (1 = a single game). Stored as
  an ordinary round scored 1 for the winner and 0 for everyone else, so sync and stats need nothing
  special.
- open: ends when you say so; the leader is crowned.
Every goal keeps its own target in the editor, so switching never turns 200 points into 200 rounds.
New game's main button stays disabled, with a line above it saying why, until the game can be dealt
(no game picked, too few or too many players for it, a missing target). Never a tap that fails.

## Design and feel
- Tokens only (both themes, WCAG AA; small coloured text gets darker "-text" tokens in Daylight).
  When Daylight needs something different, add a token to both theme blocks; never a one-off
  [data-theme="light"] rule in component CSS.
- Native feel: targets ≥ 44px; no text selection or callouts outside inputs; `touch-action:
  manipulation` on EVERY element (it doesn't inherit; this removes the tap delay); resets in
  :where() so component classes always win; safe-area insets; status bar black-translucent.
- Motion lives in one motion.css with a prefers-reduced-motion kill switch; confetti respects it.
- Sheets: a single-page sheet has a sticky title row with close top right. Anything deeper (Settings ›
  Players › Edit Kate) is a page pushed inside ONE sheet with a navigation stack: a fixed header (back
  top left past the root, the page title, close always top right), pages slide in from the right,
  Escape goes back a page. Never stack a sheet on a sheet. The main action sits in a sticky bottom CTA.
  Lay sheets out at full height from the start and use skeletons, so nothing jumps.
- Settings is a calm landing of rows: Install / Share (a QR code to the live URL) / Say hi at the
  top; "Make it yours" (Players, Games, Appearance) in the middle; Family sign-in at the bottom; and
  a build line last ("{{APP_NAME}} · <commit> · <date> · Family sync on/off", from git at build time).
  It's the fastest way to tell which version a phone is running.
- The game itself is a sheet over Home, not a screen: dealing in closes New game, then the game's
  sheet rises (titled with the game's name, close top right); Edit round and End game are pages
  pushed inside it. Close it and the game stays live; Resume and the nav button bring it back. An
  open sheet is modal, so close it before raising anything that must be tappable over it (the
  victory overlay).
- Share and install QR codes in the brand's dress (dots, rounded corner eyes, the logo in the
  middle, error correction H), but always dark on light in both themes, and decoded from a
  screenshot to prove they still scan before shipping a change to them.
- A Sticker Club: a dozen collectible stickers computed from the game history (never stored, so
  every phone agrees), scaled to each game's own numbers; each player's sticker book in a sheet,
  a "5 stickers · 7 to go" line under each name in the standings, a sealed-envelope sticker pack to tear
  open after every win (the stickers slap down one by one with a peel-and-slap sound), and the
  latest stickers on Home.
- Little moments of feel: New game opens to the app's own short tune; changing the theme grows
  the next one out of the tapped button as a circle (View Transitions; instant under reduced
  motion, and a sheet must not take the transition's overlay for a backdrop tap); segmented
  controls slide their highlight; the tab bar wears the opposite theme so it stands out, and the
  selected tab's icon fills in; standings mark ▲ / ▼ only when someone passes someone (a tie is
  not a change).
- An install guide that pops up once, per platform (iPhone Safari's Share steps, Chromium's install
  prompt, a QR code on desktop).
- Sound on iOS: Web Audio, unlocked on the first tap, with the audio session set to `playback` only
  while sounding and released when idle (so it plays with the silent switch on without pausing the
  person's music), and a mute toggle in the header. Test this on a real iPhone, home-screen
  installed; it's the part most likely to need a second pass.

## Data and sync (if family sync is on)
- Offline first: the family's data is mirrored to localStorage for instant first paint; every write
  goes into a persisted outbox BEFORE it's sent and leaves only when Firestore confirms or refuses it
  for good; Firestore uses persistentLocalCache.
- Rounds are a map keyed by a unique round id (two phones scoring at once both land). No hard
  deletes: games get deletedAt, players are archived. A finished game is frozen (only deletedAt can
  change). Every write carries updatedAt. Replays must be idempotent (no increments or array-unions).
- Security: Firestore rules allow only people with a members/{lowercase email} doc (written in the
  console only); validate every document shape with hasOnly so unknown fields are refused. Test the
  rules against the emulator.
- Firebase loads lazily (dynamic import only) and stays out of the service worker precache, so the
  demo never downloads it.
- Default games and players only seed a brand-new store, or a family record whose collections are
  empty. Give Settings › Games a "Restore default games" button (with a confirm) that resets the
  built-in games to the current defaults, re-adds deleted ones and keeps games the family added.
  Otherwise a later change to the defaults never reaches existing phones.
- When the rules refuse a new game (usually rules older than the app), say so plainly. Never report
  it as "ended on another phone".
- Deploy rules BEFORE an app version that writes a new field or value.

## PWA and deploy
- Service worker with a versioned precache (placeholders filled after `next build`), served
  uncached so installed phones update on the next launch. Icons and splash screens are generated by a
  script from one source image; never hand-edited.
- Deploys are prebuilt: `pnpm deploy` builds locally, packages the output for Vercel and runs
  `vercel deploy --prebuilt --prod`. Firebase config is NEXT_PUBLIC_* in apps/web/.env.local, baked
  in at build time. Vercel dashboard env vars are NOT used (Vercel builds nothing); a build without
  .env.local is demo-only. Document this in the README.
- A link preview that makes people want to tap: a 1200×630 card (rendered from HTML with the brand
  fonts by a script, under ~300 KB so WhatsApp shows it) plus Open Graph and Twitter tags with
  absolute URLs (a NEXT_PUBLIC_SITE_URL, defaulting to the production address). Not precached.
- README: setup, the dev commands, push/deploy/update steps, Firebase setup step by step (Spark plan,
  members docs, rules deploy), install-on-iPhone steps, troubleshooting.

## Tests (definition of done)
pnpm format, lint, typecheck and unit tests green; core logic and every store action tested with fake
timers and a fixed clock; a sync test suite against an in-memory fake Firestore, including a fuzz test
(two phones, random actions, random offline toggling, they converge); Playwright for the real flows by
exact accessible labels; every story renders with no errors and no serious axe violations in both
themes; emulator suites (rules, cloud e2e) in CI. Never add retries to get green; report real counts.
For every UI change, look at screenshots in both themes at 390 and 320 px wide.

## Agent harness (build this too, so future sessions keep the quality)
- CLAUDE.md (short: mission, priorities, map, definition of done, autonomy), AGENTS.md for other
  tools, CONVENTIONS.md (global rules), path-scoped rules in .claude/rules/ (ui, core, app, sync,
  testing, storybook, pwa-web), and docs/ (GOALS, ARCHITECTURE, DESIGN, DECISIONS as numbered ADRs,
  LESSONS as symptom → cause → fix, TESTING, SYNC as the data contract).
- Skills in .claude/skills/: verify (the full gate), ship (commit only when asked; print push/deploy
  commands), new-component, visual-check (a screenshot script for stories), storybook-review, add-game,
  sync-change, drift-and-align (audit the docs against the code and fix whichever drifted).
- Read-only reviewer agents: design-reviewer and sync-reviewer.
- Hooks: auto-format on edit; a guard that blocks edits to generated files and .env* and blocks git
  push / deploy / vercel / firebase deploy / reset --hard (judge commands, not text that mentions them).
- scripts/check-harness.mjs (every path and script the docs mention exists) in CI, and
  scripts/drift-probes.mjs (mechanical rule checks: stories exist, no raw colours, no clock in core,
  lazy Firebase, no hard deletes, dead copy/CSS/exports, no Daylight-only patches in component
  CSS, deterministic stories, every test file documented).

## Autonomy
Commit only when I ask. Never push, deploy or deploy Firestore rules: print the exact commands for me.
Don't leave dev servers running. Never read or edit .env files.
````

### The placeholders

| Placeholder | Example | Notes |
|---|---|---|
| `{{APP_NAME}}` | `Tally Ho!` | Used in the title, manifest, copy and build line |
| `{{FAMILY_NAMES}}` | `Kate, Alder and Blair` | The only people who can sign in. Their emails go in the Firebase console later, never in the repo. |
| `{{GAMES}}` | `Monopoly Deal (Who won?), Flip 7 (race to 200), Sushi Go (3 rounds), Jaipur (first to 2 wins), Bananagrams (Who won?)…` | List names only and the agent will research the endings from each rulebook. Add "(Who won?)" etc. wherever your family plays differently. |
| `{{MAKER_NAME}}`, `{{MAKER_URL}}` | `Blair Metcalf`, `https://jblairmetcalf.com` | For the "Say hi" page |

---

## Why the prompt says what it says

Each of these cost at least one round of fixes in the original build. Leave them in.

- **Sound on iOS** went through three designs before it worked reliably in an installed PWA: play through the silent switch, don't pause the person's music, survive backgrounding. The prompt asks for the final design up front.
- **`touch-action` doesn't inherit.** Setting it only on `body` leaves a tap delay on every button.
- **Defaults only seed new data.** After changing a game's default, existing phones and the family record kept the old one. Hence the Restore default games button.
- **Stale Firestore rules** refused a new kind of game, and the app first said it had been "ended on another phone". Hence: deploy rules first, and say plainly when the rules refuse a save.
- **Vercel env vars** look like the place for the Firebase config, but prebuilt deploys ignore them.
- **Nested sheets** felt fragile on a phone; one sheet with a page stack is calmer and keeps a single close button.
- **The build line in Settings** settles "is my phone on the new version?" in one glance.
- **An open sheet is modal:** the victory overlay's buttons couldn't be tapped while the game's
  sheet was open behind it. Hence: close the sheet as the overlay rises.
- **Two phones editing the same game's player limits** could each send one half and merge into a
  record the rules refuse. Fields the rules compare travel together.
- **Branded QR codes** look scannable and sometimes aren't; decode a screenshot every time.
- **A harness from the start** (rules, skills, reviewers, drift probes) keeps later sessions from undoing earlier decisions.

---

## Ship and update

Run these yourself; the agent only prints them.

**First time:**
```sh
npx vercel login
npx vercel link --cwd apps/web        # create a new project, e.g. my-app-pwa
# Family sync (optional): create the Firebase project, add members docs, then
cp apps/web/.env.example apps/web/.env.local   # fill in the four NEXT_PUBLIC_FIREBASE_* values
npx firebase-tools login
```

**Every release:**
```sh
git add -A && git commit -m "What changed"
git push                   # CI: lint, harness, typecheck, unit tests → e2e → emulator suites
pnpm firebase:rules        # only when firestore.rules changed, and before deploying
pnpm deploy                # builds locally with .env.local, ships to Vercel production
```

**Updating the installed app on a phone:** swipe it closed and open it again (twice if needed). Then check the build line at the bottom of Settings: it should show the new commit and "Family sync on". If a release changed the default games, tap **Settings › Games › Restore default games** once on any signed-in phone. It syncs to everyone.

Install it from the **production** URL (Safari › Share › Add to Home Screen), never a preview URL: an installed app is tied to the address it was installed from.

# Lessons

Gotchas this repo has already paid for, each as symptom → cause → rule. Read this when something behaves strangely, and add an entry when you lose more than a few minutes to something a future reader could hit.

## iOS and the browser

| Symptom | Cause | Fix / rule |
|---|---|---|
| No sound on iPhone with the Ring/Silent switch on | The default web audio session obeys the silent switch | Set `navigator.audioSession.type = 'playback'` before creating the context (`create()` in `packages/ui/src/feel/sfx.ts`) |
| With `playback` always on, other apps' music stopped and sounds cut in and out | `playback` takes exclusive audio; iOS offers no mode that both ignores silent and mixes (`ambient` mixes but is silent on silent) | Claim `playback` only from a tap that plays a sound; release after 6 s idle, on hide and on mute. [DECISIONS #10](DECISIONS.md#10-ios-audio-playback-only-while-sounding) |
| First sound never plays; context stuck `suspended` | iOS only starts audio inside `touchend`, `click` or `keydown`, not `pointerdown` | Create the context inside the click that plays; `SFX.unlock()` is bound to those three events in `TallyApp.tsx` |
| After backgrounding the PWA, sounds stay silent | Safari puts the context in a non-standard `interrupted` state, and resuming is unreliable | Close the context on hide/`pagehide` (`SFX.sleep`); `live()` discards `closed`/`interrupted` contexts and builds a fresh one |
| Double-tap delay / zoom on some controls despite `touch-action` on the root | `touch-action` does not inherit | Put `touch-action: manipulation` on every element (`:where(.tally) *` in `components.css`) |
| Text selects or a callout appears on long-press | Default web behaviour | `user-select: none` + `-webkit-touch-callout: none` on `.tally`; inputs and `.selectable` opt back in |
| App didn't open offline after the first visit | The service worker only intercepts requests after it controls the page; what loaded before wasn't cached | Precache the whole shell on `install` (list injected by `scripts/sw-precache.mjs`); checked by `e2e/pwa.spec.ts` |

## CSS

| Symptom | Cause | Fix / rule |
|---|---|---|
| Buttons on an overlay can't be tapped or reached by keyboard while a sheet is open (the victory overlay over the game sheet) | Radix Dialog is modal: it sets `pointer-events: none` on everything outside it and traps focus | Close the sheet before raising anything that must be interactive over it (`celebrate()` in `store.ts`). e2e caught it as click timeouts |
| A restyled QR code looks fine but might not scan | Colour, dots and rounded eyes all eat into what a camera can read | Decode screenshots with macOS's own reader: a JXA script calling `CIDetector` (`osascript -l JavaScript`); Swift may not match the SDK, and Playwright's Chromium has no `BarcodeDetector`. Check both themes at full, half and 30% size |
| Component button styles ignored (padding, background) | `.tally button { … }` resets have higher specificity than `.btn` | Wrap base resets in `:where()` (`:where(.tally) :where(button)`), so they have zero specificity |

## Storybook

| Symptom | Cause | Fix / rule |
|---|---|---|
| Sidebar/manager config changes (`manager.ts`) don't show | Manager config is read at startup | Restart `pnpm storybook` |
| The whole Storybook UI crashes (`toFixed` of undefined) on one story | A control whose type doesn't match the story's args (a `range` control on a CSS string arg) | Match `argTypes` controls to arg types. The preview-only suite (`e2e/storybook.spec.ts`) can't see this; `e2e/storybook-manager.spec.ts` opens every entry in the manager |
| `showPanel: false` has no effect | Ignored in Storybook 8.6 | Use `bottomPanelHeight: 0` (`apps/storybook/.storybook/manager.ts`) |

## Tooling and environment

| Symptom | Cause | Fix / rule |
|---|---|---|
| `grep --include=*.ts` fails with "no matches found" | zsh expands the glob before grep sees it | Quote it (`--include='*.ts'`) or use a script |
| `EADDRINUSE`, or a test hit the wrong app | Ports belong to other repos (6106 was another repo's Storybook) | Tally Ho! uses 3100 (app), 6116 (Storybook), 3101/3103/3105 (Playwright builds). Check with `lsof -iTCP:<port> -sTCP:LISTEN`; never kill another repo's server |
| Lost the Vercel token | The web app's `.env.local` holds the Vercel token as well as Firebase keys | Append to that file; never overwrite it. It's gitignored (`.env*`) |
| Export landed in an unexpected folder | With Next `output: 'export'`, `distDir` **is** the export folder | Set it via `TALLY_DIST_DIR` (build phase only) in `apps/web/next.config.ts`; the cloud e2e builds into out-cloud |
| A test failed once on a half-written file | Another builder was mid-edit | Wait for in-progress edits to land before trusting a red run; re-run before debugging |

## Data and sync

| Symptom | Cause | Fix / rule |
|---|---|---|
| Family sign in says "Signing in needs the internet once" on a computer that is online (seen on localhost) | That sentence covered every failure: the SDK not loading, a network refusal, and Firestore's `unavailable` ("client is offline") on the `members` check, which it also says when it simply gets no answer in time (another tab of the same origin holding the cache, a content blocker, a VPN). A clean browser signed in fine, so the cause is local to that browser | After the password check succeeds the phone is provably online: a failed `members` read is now `unreachable` ("the family record didn't answer… close other Tally Ho! tabs"). Every failure logs its step and raw code (`Tally Ho! sign-in failed at …` in the console): read that before guessing (`packages/app/src/sync/session.ts`) |
| Starting a game in family mode (a "Who won?" one, e.g. Monopoly Deal) ends it at once: "…was ended on another phone" | The live `firestore.rules` predate the app: they refuse `goal: 'wins'`, Firestore rolls the new game back, and the app read the rollback as a remote discard | Deploy the rules whenever `firestore.rules` changes, **before** the app (`pnpm firebase:rules`, then `pnpm deploy`). The app now says the game "couldn't be saved to the family record" instead of blaming another phone (`reactToRejection` in `packages/app/src/store.ts`, tested in `packages/app/src/sync/refused.test.ts`) |
| A replayed game creation could empty its `rounds` | Firestore `set` with `merge: true` replaces a field given as an **empty map** (merge doesn't recurse into `{}`), so a creation write carrying `rounds: {}` replayed after rounds landed wipes them | Treat creation as unsafe to replay over a live doc; keep outbox order (creation before its rounds) and test replay paths in `cloudProvider.test.ts` / `fuzz.test.ts`. The fake (`sync/fake.ts`) deep-merges, so it won't catch this alone |
| React "duplicate key" warnings; two games shown as one | Preset names were used as keys and could repeat | New game dedupes names (keeps the first, `NewGameSheet.tsx`); Settings names new presets "New game", "New game 2"… (`SettingsSheet.tsx`). Any list keyed by name needs unique names, or key by id |
| A sample score rendered as `-0` | `Math.round` of a small negative returns `-0` | Normalise with `\|\| 0` (as `packages/core/src/samples.ts` does) wherever a rounded number can be shown |

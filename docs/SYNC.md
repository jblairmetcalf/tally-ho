# Sync contract — Firebase for the family, demo for everyone else

The exact APIs, document shapes and UI labels the parallel builders code against. The plan is
in the approved plan file; this is the contract. Read CONVENTIONS.md first.

## Modes
- **demo** (signed out, or no Firebase config in the build): `localProvider` (`tallyho.v3`),
  sample data, remembered on the device. Unchanged from today.
- **family** (signed in as a member): `cloudProvider` over Firestore with its IndexedDB offline
  cache. The store and screens don't know the difference: it's the same `DataProvider` seam.

## Already done (lead)
- core: `Round.id?`, `Round.by?` (player id of the member who scored), `Game.startedBy?`;
  `migrate`/`withRoundIds` give old rounds ids `<gameId>-r<n>`; samples have ids.
- store: `submitRound` assigns a unique round id. `replaceData(next)` reacts to remote changes:
  a remote round → `flash` only; a remote finish → victory if watching, else toast
  `COPY.toast.wonElsewhere`; a remote discard → home + `COPY.toast.endedElsewhere`.
  Echoes of this phone's own writes are no-ops. `COPY.toast.syncRejected` exists.
- `SheetSpec` has `{ type: 'signin' }`, routed in `TallyApp` `SheetHost` to
  `sheets/SignInSheet.tsx` (a placeholder B replaces). `COPY.sheetLabel.signin`.
- deps installed: `firebase@^13` (app), `@firebase/rules-unit-testing`, `firebase-tools` (root dev).

## Builder A — `packages/app/src/sync/**`, `packages/app/src/TallyApp.tsx` (session wiring only)
### `sync/session.ts`
```ts
export interface Member { email: string; name: string; playerId: string }
export type SyncState = 'synced' | 'pending' | 'offline' | 'error'
export interface SyncStatus { state: SyncState; lastSyncedAt: number | null; message?: string }
export type Session = { mode: 'demo' } | { mode: 'family'; member: Member }
export type SignInErrorCode = 'wrong-credentials' | 'not-family' | 'offline' | 'too-many-attempts' | 'unknown'
export class SignInError extends Error { code: SignInErrorCode }
export interface SessionApi {
  enabled: boolean                 // Firebase configured in this build (else demo-only, hide sign-in)
  session: Session
  provider: DataProvider           // stable per session; TallyApp keys its store on it
  sync: SyncStatus | null          // family mode only
  signIn(email: string, password: string): Promise<void>   // rejects with SignInError
  signOut(): Promise<void>         // terminate Firestore, clear its IndexedDB + mirror, demo = fresh samples
  resetDemo(): void                // demo store back to freshStore(systemClock)
  sendPasswordReset(email: string): Promise<void>
}
export const SessionContext: React.Context<SessionApi | null>
export function useSession(): SessionApi           // throws outside the provider
export function useSessionController(): SessionApi // used once, at the app root
export function demoSession(over?: Partial<SessionApi>): SessionApi // for stories/tests
```
- Session flag `tallyho.session` = JSON `Member`. With the flag present, boot **straight into
  family mode** from the mirror (sync first paint), then load Firebase lazily (dynamic
  `import()`), restore auth (`indexedDBLocalPersistence`). If auth says nobody is signed in,
  or `members/{email}` is missing → back to demo.
- `signIn`: `signInWithEmailAndPassword`, then `getDoc(members/{lowercase email})` from the
  server; missing → sign out, throw `not-family`. Map auth errors: `auth/invalid-credential`,
  `auth/wrong-password`, `auth/user-not-found` → wrong-credentials; `auth/network-request-failed`
  → offline; `auth/too-many-requests` → too-many-attempts.
- First family sign-in seeds `players` (DEFAULT_PLAYERS) and `presets` (DEFAULT_PRESETS) with
  their fixed ids if the collections are empty (idempotent `setDoc` merge).
### `sync/config.ts`
`firebaseConfig(): { apiKey, authDomain, projectId, appId } | null` from
`NEXT_PUBLIC_FIREBASE_API_KEY | _AUTH_DOMAIN | _PROJECT_ID | _APP_ID` (each spelled out so Next
inlines them). `NEXT_PUBLIC_FIREBASE_EMULATOR=1` → connect Auth to `http://127.0.0.1:9099` and
Firestore to `127.0.0.1:8080` (projectId `demo-tally`; any apiKey).
### `sync/firebase.ts`
Dynamic-import loader returning a small `FirestoreApi` + `AuthApi` (pattern:
`chief-of-staff/packages/data/src/firebase.ts`). Firestore:
`initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: standalone ?
persistentSingleTabManager({}) : persistentMultipleTabManager() }) })`, standalone =
`matchMedia('(display-mode: standalone)').matches || navigator.standalone`. On `visibilitychange`
→ visible, if Firestore has failed (an IndexedDB error / failed-precondition), terminate and
re-init.
### `sync/diff.ts` — `diff(prev: Store, next: Store, by: string): Op[]`
By id with deep equality; only real changes. Rounds diff by `round.id` into field ops.
### `sync/cloudProvider.ts`
`DataProvider` plus `watchStatus(cb): unsub` and `onRejected(cb): unsub` (a write the rules
refused). `load()` = mirror (`tallyho.family`) or an empty family store (no samples). `save`
→ diff → writes; new rounds get `by` = member.playerId, new games `startedBy`. Snapshots of
`players`, `presets`, `games` (filter `deletedAt`) → assemble Store (prefs and `lastPlayerIds`
from the current local store, never synced) → `subscribe` callback, skipping snapshots
deep-equal to the current state. Status from `hasPendingWrites`/`fromCache` + `navigator.onLine`.
Deletes are **soft**: `deletedAt` (games). Presets may hard-delete. Players are never deleted.
### `sync/fake.ts`
In-memory Firestore implementing `FirestoreApi`, shareable by several clients, with
`setOffline(bool)`, pending writes, snapshot delivery, and a rules hook to reject writes.
### `TallyApp.tsx`
Root becomes: `useSessionController()` → `<SessionContext.Provider>` → the existing app keyed on
the session (`key={mode + email}`) with `provider={api.provider}`. `onRejected` → toast
`COPY.toast.syncRejected`. Keep existing props (`provider`, `store`, `embedded`, `silent`,
`initialUi`) working for stories/tests: an explicit `provider`/`store` prop means demo-like
static session (use `demoSession()`), and a `session` prop may inject a fake SessionApi.
### Tests
Vitest with `fake.ts`: round append = one `rounds.<id>` write; two clients appending at once
keep both; offline pending → online flush → other client receives; remote snapshot → no echo
save; sign-out clears; non-member rejected; **fuzz**: random action sequences on two clients
with random offline toggling converge to identical stores.

## Firestore documents (A writes them, C's rules validate them)
| Path | Fields |
|---|---|
| `members/{lowercase email}` | `name: string, playerId: string` — console-only |
| `players/{id}` | `id, name (1–16), color (0–7 int), archived?: bool, updatedAt: string` |
| `presets/{id}` | `id, name (1–32), goal ('score'\|'rounds'\|'open'), target (int>0 \| null), lowWins: bool, updatedAt` |
| `games/{id}` | `id, name (1–40), goal, target, lowWins, playerIds (list 2–12), startedAt, completedAt (string\|null), winnerId (string\|null), startedBy?, deletedAt?: string, updatedAt, rounds: map<roundId, { scores: map<playerId, int\|null>, at: string, by?: string }>` |

Rules (C): members-only (`exists(members/$(request.auth.token.email.lower()))`); `members`
readable by its owner only, never writable; players/presets/games shape-validated; **no hard
deletes** of games or players (presets may delete); a game whose stored `completedAt != null`
may only change `deletedAt`/`updatedAt` (late rounds rejected).

## Builder B — UI
Files: `packages/app/src/sheets/SignInSheet.tsx` (replace placeholder),
`sheets/SettingsSheet.tsx` (Family section + Export), `screens/HomeScreen.tsx` (Demo chip /
SyncBadge), `sheets/NewGameSheet.tsx` (live-game warning), `copy.ts` (new strings),
`packages/ui/src/primitives/SyncBadge.tsx` (+ stories, + barrel), `packages/ui/src/brand/Icon.tsx`
(add `cloud`, `cloudOff`, `lock`, `download`), `packages/ui/src/scoreboard/RoundLog.tsx`
(optional `nameOf?: (id) => string` → a tiny "by" initial per row when rounds carry `by`),
`packages/app/src/screens/GameScreen.tsx` (pass `nameOf`), stories for these in
`packages/app/src/*.stories.tsx` using `demoSession(...)`/a fake `SessionApi`.
- Consume only `useSession()` (A's API above). Until A lands, code against the types.
- **Exact labels (e2e selects by them):**
  - Settings Family section: heading "Family"; signed out: Button **"Family sign in"**
    (opens `{type:'signin'}`) and Button **"Reset demo"**; signed in: text "Signed in as {name}",
    the SyncBadge, ConfirmButton label **"Sign out"** armed **"Tap again to sign out"**,
    Button **"Export family record"** (downloads `tally-ho-{yyyy-mm-dd}.json`).
  - SignInSheet: title "Family sign in"; TextInput label **"Email"** (`type=email`,
    `autoComplete="username"`, `inputMode="email"`), **"Password"** (`type=password`,
    `autoComplete="current-password"`), Button **"Sign in"**; link-button **"Forgot password?"**;
    errors (role="alert"): wrong-credentials "That email and password don't match.",
    not-family "This scoreboard is just for the family.", offline "Signing in needs the
    internet once. After that, Tally Ho! works offline.", too-many-attempts "Too many tries.
    Wait a minute and try again." On success: close the sheet, toast "Welcome, {name}!".
  - Home header: demo → a small pill **"Demo"** (button; opens Settings); family → `SyncBadge`.
  - `SyncBadge {state: SyncState}`: icon + `aria-label`: synced **"Synced"**, pending
    **"Saved on this phone · syncing"**, offline **"Offline · saved on this phone"**, error
    **"Sync problem"**. Compact 44px icon button style; tapping shows the label as a toast.
  - NewGameSheet: when `data.active` exists, a Notice at the top: "{game} is in progress"
    (+ " · started by {name}" when `startedBy`), Button **"Resume"** (closes the sheet and
    resumes). Starting anyway keeps today's behaviour.

## Builder C — security, emulator, CI, docs
Files: `firestore.rules`, `firebase.json` (firestore rules + emulators auth 9099 / firestore
8080, ui off), `.firebaserc` (`{"projects":{"default":"tally-ho"}}`, note to change),
`packages/app/src/sync/rules.test.ts` (`@firebase/rules-unit-testing`; `describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)`),
`apps/web/.env.example`, `apps/web/next.config.ts` (`distDir` from `TALLY_DIST_DIR`, default
`out`), `e2e/cloud.spec.ts` (emulators: seed a member + a stranger via the Auth emulator REST
and `members` via Firestore emulator REST with `Authorization: Bearer owner`), a `cloud`
Playwright project + webServer building with `NEXT_PUBLIC_FIREBASE_EMULATOR=1` into `out-cloud`
(only when `CLOUD_E2E=1`), root scripts `firebase:rules` (deploy rules), `test:rules`,
`e2e:cloud`, the CI job (Java + `npx firebase-tools emulators:exec --only auth,firestore`),
README "Family sync (Firebase)" setup + why Spark, CONVENTIONS note. Don't edit A's or B's files.

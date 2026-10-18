# Sync contract: Firebase for the family, demo for everyone else

The exact session API, Firestore document shapes, rules and UI labels family sync is built on. Read this before changing anything in `packages/app/src/sync`, `firestore.rules`, a synced field or a sync-related label. Change a synced field here, in `firestore.rules` and in `packages/app/src/sync/rules.test.ts` together. The data flow around it is in [ARCHITECTURE.md](ARCHITECTURE.md#data-flow).

## Modes

- **demo** (signed out, or no Firebase config in the build): `localProvider` (`tallyho.v3`), sample data, remembered on this device only.
- **family** (signed in as a member): `cloudProvider` over Firestore with its IndexedDB offline cache. The store and screens don't know the difference: it's the same `DataProvider` seam. Read the session with `useSession()` only for sign-in UI and the sync badge.

## Local keys

| Key | Holds | Module |
|---|---|---|
| `tallyho.v3` | The demo store (and the prefs the boot script reads) | `packages/app/src/provider.ts` |
| `tallyho.v2` | The prototype's store; migrated once, kept as a backup | `packages/app/src/provider.ts` |
| `tallyho.session` | The signed-in `Member` (JSON); its presence boots straight into family mode | `packages/app/src/sync/storage.ts` |
| `tallyho.family` | Mirror of the family `Store`: synchronous, offline first paint | `packages/app/src/sync/storage.ts` |
| `tallyho.outbox` | Family writes not yet settled by Firestore; replayed next launch | `packages/app/src/sync/outbox.ts` |

## Core and store support

- core: `Round.id?`, `Round.by?` (player id of the member who scored), `Game.startedBy?`, `Preset.roundsPerPlayer?`, goal `'wins'`. `migrate` / `withRoundIds` give old rounds ids `<gameId>-r<n>`; samples have ids.
- store: `submitRound` assigns a unique round id; `submitWinner(id)` is a `submitRound` of 1/0 scores, and `crownWinner(id)` finishes a tied game for one tied leader, so both sync as ordinary round and finish writes. `replaceData(next)` reacts to remote changes: a remote round → `flash` only; a remote finish → victory if watching, else toast `COPY.toast.wonElsewhere`; a remote discard → home, and 400ms later `COPY.toast.endedElsewhere` unless this phone's write of that game was refused (then `gameRefused` already said so). Echoes of this phone's own writes are no-ops. `gameRefused(gameId, name)` records a game the family record refused (`COPY.toast.gameRefused`); `restoreDefaultGames()` rewrites every `DEFAULT_PRESETS` id to today's defaults (re-adding deleted ones, keeping the family's own presets), so it syncs as ordinary preset sets/updates.
- `SheetSpec` includes `{ type: 'signin' }`, routed in `TallyApp`'s sheet host to `packages/app/src/sheets/SignInSheet.tsx` (stories use it). In the app, Settings pushes the same sign-in content as a page on its `SheetNav` stack (`go('signin')`).

## Session API (`packages/app/src/sync/session.ts`)

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
  signOut(): Promise<void>         // terminate Firestore, clear mirror + outbox + flag, demo = fresh samples
  resetDemo(): void                // demo store back to fresh samples
  sendPasswordReset(email: string): Promise<void>
}
export const SessionContext: React.Context<SessionApi | null>
export function useSession(): SessionApi           // throws outside <TallyApp>
export function useSessionController(): SessionApi // used once, at the app root
export function demoSession(over?: Partial<SessionApi>): SessionApi // for stories/tests
export function createSessionCore(opts: SessionCoreOptions): SessionCore // the plain object; tests drive it
```

- **Boot:** with `tallyho.session` present, the app boots straight into family mode from the mirror (synchronous first paint), then loads Firebase lazily (dynamic `import()`) and restores auth (`indexedDBLocalPersistence`). If auth says nobody (or someone else) is signed in, or `members/{email}` is missing or refused → sign out to demo. Offline at launch → stay in family mode and check next launch.
- **`signIn`:** `signInWithEmailAndPassword` with the lowercased email, then read `members/{email}` from the server; missing or `permission-denied` → sign out, throw `not-family`; any other failure of that read → sign out, and a would-be `offline` becomes `unreachable` (the password check just got through, so the phone is online: Firestore's "client is offline" means the record didn't answer in time). Error mapping (`signInErrorOf`): `auth/invalid-credential`, `auth/invalid-login-credentials`, `auth/wrong-password`, `auth/user-not-found`, `auth/invalid-email`, `auth/missing-password` → `wrong-credentials`; `auth/network-request-failed`, `unavailable`, or an SDK that can't load → `offline`; `auth/too-many-requests` → `too-many-attempts`; else `unknown`. Every failure also logs its step and raw code with `console.warn` ("Tally Ho! sign-in failed at …"), since several causes share one sentence.
- **Seeding:** the first family sign-in writes `players` (`DEFAULT_PLAYERS`) and `presets` (`DEFAULT_PRESETS`) with their fixed ids if the collections are empty (idempotent set-merge; retried on the next sign-in if it fails). Never samples. Changing `DEFAULT_PRESETS` never rewrites a family's existing presets by itself: an already-seeded family picks up new defaults with Settings › Games › **Restore default games** (`restoreDefaultGames`), or edits a game by hand.
- **`TallyApp`:** `useSessionController()` → `<SessionContext.Provider>` → the app keyed on mode + email + provider. `onRejected` → `reactToRejection` (`store.ts`): a refused games `set` (usually rules older than the app) → `gameRefused`, toast `COPY.toast.gameRefused`; any other refusal → toast `COPY.toast.syncRejected`. Explicit `provider` / `store` props mean a static demo-like session (`demoSession()`); a `session` prop injects a fake `SessionApi` (stories).

## Modules (`packages/app/src/sync/`)

| File | Role |
|---|---|
| `config.ts` | `firebaseConfig()` from `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` (each spelled out so Next inlines them), or null. `NEXT_PUBLIC_FIREBASE_EMULATOR=1` → emulators, project `demo-tally` |
| `firebase.ts` | `loadFirebase()`: dynamic imports, `initializeFirestore` with `persistentLocalCache` (single-tab manager when standalone, multi-tab otherwise); on `visibilitychange` → visible, a failed Firestore is terminated and re-initialised. Exposes small `FirestoreApi` / `AuthApi` interfaces |
| `diff.ts` | `diff(prev, next, by): Op[]`: by id, deep equality, only real changes. Rounds diff by `round.id` into `rounds.<id>` field ops. Games disappear as `deletedAt`; players are never deleted; presets may be |
| `docs.ts` | Store ↔ documents (`gameDoc`, `gameFrom`…), `deepEqual` |
| `outbox.ts` | Persisted write queue: entries made with resolved timestamps and `updatedAt`, idempotent, retryable vs final errors |
| `cloudProvider.ts` | `DataProvider` + `watchStatus(cb)` + `onRejected(cb)` + `dispose()`. `load()` = mirror, or an empty family store (no samples). `save` → diff → outbox → writes; new rounds get `by` = `member.playerId`, new games `startedBy`. Snapshots of `players`, `presets`, `games` (minus `deletedAt`) assemble a Store (prefs and `lastPlayerIds` from the local store, never synced); deep-equal snapshots are skipped. Status from pending writes / `fromCache` + `navigator.onLine` |
| `storage.ts` | Local keys and safe JSON helpers |
| `fake.ts` | In-memory Firestore (`FakeBackend` shared by several `FakeFirestore` clients) with `setOffline`, pending writes, snapshots and a rules hook |
| `testkit.ts` | Test helpers: `seedFamily`, `phone`, `settle`, `tickingClock` |

## Firestore documents

| Path | Fields |
|---|---|
| `members/{lowercase email}` | `name: string, playerId: string`. Console-only |
| `players/{id}` | `id, name (1–16), color (0–7 int), archived?: bool, updatedAt: string` |
| `presets/{id}` | `id, name (1–32), goal ('score'\|'rounds'\|'wins'\|'open'), target (int>0 \| null; an int for 'wins'), lowWins: bool, roundsPerPlayer?: bool, updatedAt`. `roundsPerPlayer` is optional (old clients' docs lack it, and the rules still accept them); switching it off writes `false`; a preset that drops the key sends `deleteField()` (both valid) |
| `games/{id}` | `id, name (1–40), goal (as presets), target (int>0 \| null; an int for 'wins'), lowWins, playerIds (list 2–12), startedAt, completedAt (string\|null), winnerId (string\|null), startedBy?, deletedAt?: string, sample?: bool (legacy: still accepted, never written; sample games don't sync), updatedAt, rounds: map<roundId, { scores: map<playerId, int\|null>, at: string, by?: string }>` (≤ 1000 rounds). A "Who won?" (`wins`) round is an ordinary round scored `{ winner: 1, others: 0 }`; games never carry `roundsPerPlayer` (the round count is fixed into `target` when dealt) |

## Rules (`firestore.rules`)

- Members only: `exists(members/$(request.auth.token.email.lower()))`.
- `members`: a signed-in user may `get` their own doc only; nobody lists or writes it.
- `players`, `presets`, `games`: shape-validated on create/update (exact key sets, types, lengths).
- `goal` is `'score' | 'rounds' | 'wins' | 'open'`; a `'wins'` preset or game must have an int `target` (older score/rounds docs aren't held to this). New optional keys go in `hasOnly`, never `hasAll`, so documents written by older app versions stay valid.
- **No hard deletes** of games or players; presets may be deleted.
- A game whose stored `completedAt != null` may only change `deletedAt` / `updatedAt` (late rounds refused; undoing a delete allowed).
- Everything else is denied. Deploy with `pnpm firebase:rules`, **before** an app version that writes a new value or key (old rules refuse `'wins'` and `roundsPerPlayer`; new rules keep accepting older app versions' writes).

## UI labels

Exact strings; e2e selects by them. Source: `packages/app/src/copy.ts` (`COPY.family`, `COPY.signIn`) and `packages/ui/src/primitives/SyncBadge.tsx`.

- **Settings › Family** (heading "Family"):
  - signed out: Button **"Family sign in"** (pushes the sign-in page) and Button **"Reset demo"**.
  - signed in: "Signed in as {name}", the `SyncBadge`, `ConfirmButton` **"Sign out"** (armed: **"Tap again to sign out"**), Button **"Export family record"** (downloads `tally-ho-{yyyy-mm-dd}.json`).
- **SignInSheet:** title "Family sign in"; TextInput **"Email"** (`type=email`, `autoComplete="username"`, `inputMode="email"`), **"Password"** (`type=password`, `autoComplete="current-password"`), Button **"Sign in"**, link-button **"Forgot password?"**. Errors (`role="alert"`):
  - wrong-credentials: "That email and password don't match."
  - not-family: "This scoreboard is just for the family."
  - offline: "Signing in needs the internet once. After that, Tally Ho! works offline."
  - unreachable: "You're online, but the family record didn't answer. Close any other Tally Ho! tabs or windows and try again."
  - too-many-attempts: "Too many tries. Wait a minute and try again."
  - unknown: "Couldn't sign in. Try again."
  - On success the app re-keys into family mode and the new Home toasts "Welcome, {name}!" once (`takeWelcome`).
- **Home header:** demo → a small pill button **"Demo"** (opens Settings); family → `SyncBadge`.
- **`SyncBadge`** (`aria-label`, 44px icon button; tapping toasts the label): synced **"Synced"**, pending **"Saved on this phone · syncing"**, offline **"Offline · saved on this phone"**, error **"Sync problem"**.
- **NewGameSheet:** when a game is live, a notice "{game} is in progress" (+ " · started by {name}" when `startedBy`) and Button **"Resume"**. Starting anyway replaces it as before.
- **RoundLog:** with `nameOf`, rounds carrying `by` show the scorer's initial.
- **Settings › Games:** `ConfirmButton` **"Restore default games"** (armed: **"Tap again to restore"**), toast **"Default games restored"**.

## Emulators and tests

| Piece | Setting |
|---|---|
| `firebase.json` | Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`, UI off, single project |
| `.firebaserc` | `default: tally-ho` (change to your project id) |
| Project id in tests | `demo-tally` (never touches a real project) |
| `pnpm test:rules` | `firebase emulators:exec --only firestore` → `packages/app/src/sync/rules.test.ts` (skips without `FIRESTORE_EMULATOR_HOST`) |
| `pnpm e2e:cloud` | `firebase emulators:exec --only auth,firestore` with `CLOUD_E2E=1` → the `cloud` Playwright project: builds the app with `NEXT_PUBLIC_FIREBASE_EMULATOR=1` into out-cloud (`TALLY_DIST_DIR`), serves on 3105, seeds users via the Auth emulator REST API and `members` via the Firestore emulator REST API (`Authorization: Bearer owner`) in `e2e/cloud-helpers.ts` |
| CI | The `cloud` job in `.github/workflows/ci.yml` (Java 21) |

Both emulator suites need Java 21+. See [TESTING.md](TESTING.md).

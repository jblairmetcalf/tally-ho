---
paths:
  - "packages/app/src/sync/**"
  - "firestore.rules"
  - "docs/SYNC.md"
---

# Family sync — Firestore, rules, the contract

`docs/SYNC.md` is the contract. Skill: `sync-change`. Reviewer agent: `sync-reviewer`.

- **Change these together or not at all:** `docs/SYNC.md` (documents table), `firestore.rules`, `packages/app/src/sync/rules.test.ts`, `packages/app/src/sync/docs.ts`, `packages/app/src/sync/diff.ts`. A field the rules don't list (`hasOnly`) is refused in production.
- **Never hard-delete a game or player.** Games get `deletedAt` (diff emits it, `gameFrom` filters it); players get `archived`. Only presets may `delete`. The rules deny the rest; don't loosen them.
- **A finished game is frozen**: once `completedAt` is set, only `deletedAt`/`updatedAt` may change (`frozenOk()` in the rules, `finishedGamesAreFinal` in `packages/app/src/sync/fake.ts`). A final round and its `completedAt` must land in one update.
- **Rounds are a map keyed by round id** (`rounds.<id>` field updates), so two phones scoring at once both land. Never write the rounds map wholesale on an update.
- **Every set and update carries `updatedAt`** (`toEntry` in `packages/app/src/sync/outbox.ts` adds it; seeding in `packages/app/src/sync/session.ts` sets it). The rules require it.
- **`diff()` never reads the clock**: it emits the `NOW` and `DELETE` sentinels; the provider resolves them. Keep diff pure and deterministic.
- **The outbox must replay idempotently**: set-merge, field updates, soft deletes only. Timestamps are resolved when the entry is made, so a replay is the same write. Never add an increment or array-union.
- **Firebase loads lazily.** Only dynamic `import('firebase/...')` in `packages/app/src/sync/firebase.ts`; no static `firebase` import anywhere (not even in types-only code paths that bundle). Demo mode must never pull it into first paint; `scripts/sw-precache.mjs` also keeps those chunks out of the precache.
- **Samples and prefs never sync.** `gamesOf` drops `sample` games; prefs and `lastPlayerIds` stay on the phone.
- **Skip echoes**: snapshots deep-equal to current state don't call back, and a remote snapshot must never cause a save.
- **Firestore refuses `undefined`**: build docs with `clean()` / the `*Doc` helpers in `packages/app/src/sync/docs.ts`; read them back with the `*From` helpers (Zod-validated, bad docs dropped).
- **Local keys** are `MIRROR_KEY`, `OUTBOX_KEY`, `SESSION_KEY` in `packages/app/src/sync/storage.ts`. Sign-out clears mirror and outbox.
- **Test with the fake**, not the emulator, for logic: `FakeBackend` / `FakeFirestore` and the helpers in `packages/app/src/sync/testkit.ts`; add a case to `packages/app/src/sync/fuzz.test.ts` if a new op could break convergence. Run `pnpm --filter @tally/app exec vitest run src/sync`.
- **Emulator suites are CI-only here** (no Java locally): `pnpm test:rules` and `pnpm e2e:cloud` skip or fail without it. Say "not run locally" rather than claiming them green.
- **Deploying rules is the user's call**: print `pnpm firebase:rules` for them whenever `firestore.rules` changed.
- **`members` is console-only**: the app reads its own doc and never writes it.

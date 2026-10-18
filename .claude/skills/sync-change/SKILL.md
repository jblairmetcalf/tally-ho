---
name: sync-change
description: Change anything that syncs to Firestore in Tally Ho! - a field on players, presets, games or rounds, a new collection, a delete/archive behaviour, or the rules - by moving the core schema, the sync document and diff code, firestore.rules, rules tests, docs/SYNC.md and the fake/fuzz tests together, then getting a sync-reviewer pass. Use for any edit under packages/app/src/sync, firestore.rules, docs/SYNC.md, or a synced field in packages/core/src/schemas.ts.
---

# Sync change

Read `docs/SYNC.md` and `.claude/rules/sync.md` first. The invariants: no hard deletes of games/players, finished games frozen, rounds keyed by id, `updatedAt` on every write, Firebase loaded lazily, outbox replays idempotent.

## Steps (in this order)

1. **Core schema**: `packages/core/src/schemas.ts`. New fields are `.optional()` so old local data and old documents still parse. If existing data needs filling (as `withRoundIds` gives old rounds ids), do it in `packages/core/src/migrate.ts`, idempotently, with a case in `packages/core/src/core.test.ts`.
2. **Documents**: `packages/app/src/sync/docs.ts`: write the field in `playerDoc` / `presetDoc` / `gameDoc` / `roundDoc` (through `clean()`, Firestore refuses `undefined`), read it back in `playerFrom` / `presetFrom` / `gameFrom`.
3. **Diff**: `packages/app/src/sync/diff.ts`: games list their synced fields in `GAME_FIELDS`; rounds change as `rounds.<id>` field ops; deletions are `deletedAt: NOW` (games), nothing (players), `delete` (presets only). Keep diff pure: no clock, `NOW`/`DELETE` sentinels only.
4. **Provider/outbox** (only if write semantics change): `packages/app/src/sync/cloudProvider.ts`, `packages/app/src/sync/outbox.ts`. Every set/update gets `updatedAt` via `toEntry`; a replayed entry must be the same write.
5. **Rules**: `firestore.rules`: add the key to the right `validX()` `hasAll`/`hasOnly` lists with a type check. Don't loosen `delete: if false` or `frozenOk()`.
6. **Rules tests**: `packages/app/src/sync/rules.test.ts`: one allowed and one refused case for the new shape (wrong type, too long, on a finished game).
7. **Fake**: if the rule is behavioural (like freezing), mirror it in `packages/app/src/sync/fake.ts` (see `finishedGamesAreFinal`) so unit tests see the same refusals.
8. **Tests**: `packages/app/src/sync/diff.test.ts` (ops), `cloudProvider.test.ts` (round trip, offline → online), and extend `fuzz.test.ts` if the new op could break two-phone convergence.
9. **Contract**: `docs/SYNC.md` "Firestore documents" table, and the labels list if UI text changed.
10. **Run**:
    ```sh
    pnpm --filter @tally/core test
    pnpm --filter @tally/app exec vitest run src/sync
    pnpm typecheck && pnpm lint
    ```
    `rules.test.ts` is skipped here (no emulator). `pnpm test:rules` and `pnpm e2e:cloud` need Java and run in CI's `cloud` job: report them as **not run locally**.
11. **Review**: invoke the `sync-reviewer` agent on the diff and address blockers.
12. **Hand-off**: the user deploys rules with `pnpm firebase:rules` (rules before app if the app now writes a field old rules refuse). Old app versions on phones must still pass the new rules: new required keys break them, so keep new keys optional in `hasOnly`, not `hasAll`.

## Checklist

- [ ] schema optional / migrated + core test
- [ ] `packages/app/src/sync/docs.ts` write + read
- [ ] `packages/app/src/sync/diff.ts` op + diff test
- [ ] rules shape + rules.test.ts allow/deny
- [ ] fake mirrors any new behavioural rule
- [ ] SYNC.md table
- [ ] sync vitest green; emulator suites flagged CI-only
- [ ] sync-reviewer: no blockers
- [ ] lazy loading intact: no static `firebase` import added

## Report template

```
Sync change: <field/behaviour>
- files: <schema, sync docs + diff, rules, rules.test.ts, fake.ts, SYNC.md, …>
- core tests: <p passed>; sync tests: <p passed, s skipped>
- not run locally: pnpm test:rules, pnpm e2e:cloud (CI)
- sync-reviewer: <blockers resolved / remaining>
- deploy order: <pnpm firebase:rules before|after pnpm deploy, why>
- old-client compatibility: <how old app versions behave under new rules>
```

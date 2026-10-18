---
name: ship
description: Get a finished Tally Ho! change ready to release - run the verify skill, summarise the diff, propose a commit message, commit only if the user asked, and print (never run) the push / deploy / Firestore-rules commands plus the iPhone post-deploy checklist. Use when the user says ship it, release, deploy, push, "ready to go?", or asks for a commit.
---

# Ship

You prepare; the user releases. Never `git push`, `pnpm deploy`, `pnpm deploy:storybook` or `pnpm firebase:rules` yourself: they change production and the family's phones.

## Steps

1. **Verify.** Run the `verify` skill in full (clean build, `CI=true pnpm e2e`). If anything is red or flaky, stop and report; don't ship around it.
2. **Show what's going out:**
   ```sh
   git status --short
   git diff --stat
   git log --oneline -5
   ```
   Summarise by package (core / ui / app / web / sync / docs / tooling). Flag anything unexpected: files `pnpm format` touched, build output, `.env*`, `apps/web/public` images not made by `pnpm icons`.
3. **Decide what else the release needs** (each is a line in the hand-off):
   - `firestore.rules` changed → the user must run `pnpm firebase:rules`. Rules and app ship together: deploy rules **first** if the new app writes a field the old rules refuse; app first if the new rules refuse something old apps still write.
   - `packages/core/src/presets.ts` or samples changed → existing phones keep their data: demo users need **Settings › Reset demo**; the family record only seeds when empty, so new presets reach the family via Settings › Games.
   - `apps/web/.env.local` changed → needs `pnpm deploy` (config is baked in at build).
   - Storybook changed → optional `pnpm deploy:storybook`.
   - Sync contract changed → CI's `cloud` job (`pnpm test:rules`, `pnpm e2e:cloud`) is the only proof; it hasn't run locally.
4. **Propose a commit message**: imperative subject ≤ 72 chars, a short body saying why, ending with the Co-Authored-By trailer this session's attribution reminder gives (copy it exactly; don't invent one).
5. **Commit only if the user asked to.** Stage explicit paths (`git add <paths>`), not `-A`, unless every changed file is meant to go. If on `main` and the user wants a branch/PR, branch first. Never amend or force anything without being asked.
6. **Hand off the commands**, exactly, for the user to run:
   ```sh
   git push                 # CI: lint/typecheck/test → e2e → rules + cloud e2e
   pnpm firebase:rules      # only if firestore.rules changed
   pnpm deploy              # app → Vercel production (prebuilt from this machine)
   pnpm deploy:storybook    # optional
   ```
   First time on this machine? Point to README.md "Ship it" (`npx vercel login`, `npx vercel link --cwd apps/web`) and "Family sync (Firebase)" (`npx firebase-tools login`, `.firebaserc`, `apps/web/.env.local` from `apps/web/.env.example`).

## Post-deploy checklist (iPhone, production URL)

- [ ] Swipe Tally Ho! closed and reopen it (twice if needed): the build line at the bottom of Settings shows the new commit and **Family sync on**.
- [ ] With the Ring/Silent switch on silent, score a round: sound plays (speaker button in the Home header lit).
- [ ] Signed in: Home shows the sync badge → **Synced**; score on one phone, see it on another.
- [ ] Airplane mode: app opens, a round saves (**Offline · saved on this phone**), syncs when back.
- [ ] Daylight phone: no dark flash at launch.
- [ ] If defaults changed: **Settings › Games › Restore default games** once on a signed-in phone (syncs to the family), and on demo phones (or Reset demo, which wipes demo games).

## Report template

```
Ship readiness
- verify: <summary line from the verify report>
- changes: <n files; by package>
- commit: <proposed message | committed <sha> on <branch>>
- you run: git push; <pnpm firebase:rules>; pnpm deploy; <pnpm deploy:storybook>
- order: <rules before app | app before rules | n/a> because <…>
- not verified locally: <pnpm test:rules / pnpm e2e:cloud | none needed>
- after deploy: reopen app; <Reset demo note>; checklist above
```

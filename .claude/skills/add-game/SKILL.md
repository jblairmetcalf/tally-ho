---
name: add-game
description: Add a board or card game to Tally Ho!'s default game presets (packages/core/src/presets.ts) with the goal its rulebook gives - race to a score, a fixed number of rounds, "Who won?" (won outright, or first to N wins), or open-ended - and the right target and low-score-wins flag. Use when the user wants a new game in the New game list, asks how a game should be scored in the app, or wants to change a default preset.
---

# Add a game

## 1. Pick the goal from the rulebook

Read how the rulebook ends the game (the official rules, current edition), not how families usually score it on paper. The research behind the defaults is decision 16 in `docs/DECISIONS.md`. The app's goals (`GoalSchema` in `packages/core/src/schemas.ts`, ended by `evaluate()` and labelled by `goalLabel()` in `packages/core/src/scoring.ts`):

| Goal | Ends when | Use for | In `DEFAULT_PRESETS` |
|---|---|---|---|
| `wins` + `target: 1` ("Who won?") | the round's winner is tapped; one round, one winner | games won outright, not on points | Monopoly Deal, High Society, Spicy, Uno (official rules since 2022), Schotten Totten |
| `wins` + `target: N` ("First to N wins") | someone has won N rounds (each round: tap the winner) | best-of series | **Jaipur 2** (first to two Seals of Excellence) |
| `score` + `target` ("Race to N") | someone reaches the target (ties → tiebreak round or pick by the game's tiebreak) | games won on accumulated points over several hands | Mille Bornes 1000 (family choice; rulebook 5000), The Fox in the Forest 21, Flip 7 200 |
| `rounds` + `target` ("N rounds") | after N rounds, highest total wins | a fixed number of hands | Sushi Go 3 |
| `rounds` + `target: 1` ("Final scores") | one tally at the end | games played once and scored at the end | **Push** (one final tally when the deck runs out) |
| `rounds` + `roundsPerPlayer: true` | after one round per player (`targetFor` sets the count from the line-up) | one round per dealer | **Scout** (`target` 3 is only the fallback) |
| `open`, `target: null` ("Open-ended") | when you tap the flag; the leader is crowned | no fixed end at all | none by default |

`lowWins: true` flips `score` and `rounds`: lowest total wins and a score target becomes a bust line (Hearts 100, Golf, Skyjo). Keep it `false` for `wins`. Decision points:
- Won outright (a set collected, a hand emptied, a last player standing) rather than on points? `wins` with target 1, even if the box has optional points scoring.
- A best-of series (first to N seals, trophies, games)? `wins` with target N.
- Points over several hands until someone reaches a total? `score` with the rulebook's target (note variants in a comment).
- A fixed number of hands? `rounds` with N; one per player (each deals once)? `roundsPerPlayer: true`.
- One game, scored once at the end? `rounds` with target 1.
- No end the rules define? `open`.
- Unsure, or no rulebook to hand? Ask the user; don't guess a target.

## 2. Add it

In `packages/core/src/presets.ts`, append to `DEFAULT_PRESETS`:
```ts
// Ticket to Ride: one final tally after the last turn (someone is down to 2 trains).
{ id: 'ticket-to-ride', name: 'Ticket to Ride', goal: 'rounds', target: 1, lowWins: false },
```
- `id` is the slug of the name (`slug()` in `packages/core/src/migrate.ts`: lowercase, non-alphanumerics → `-`). It's a Firestore document id and a saved-data key: **never rename or reuse an existing id**.
- `name` ≤ 32 chars, as printed on the box.
- `target` is a positive integer for `score`/`rounds`/`wins`, `null` for `open`.
- `roundsPerPlayer: true` only with `rounds` (it's an optional, synced field: leave it off otherwise).
- Keep the comment above `DEFAULT_PRESETS` true, and add the game to decision 16's table in `docs/DECISIONS.md` with its rulebook ending.

## 3. Check

```sh
pnpm --filter @tally/core test
pnpm typecheck
```
If you changed an existing preset's goal/target, run the web suite too: e2e uses Flip 7 (race, also in `e2e/cloud.spec.ts`) and Sushi Go (rounds):
```sh
pnpm exec playwright test --project=web
```

## 4. Tell the user what reaches whom

- **New installs / Reset demo** get the new list (`emptyStore`, `freshStore`).
- **Existing demo phones keep their saved presets**: Settings › Family › **Reset demo** (this replaces demo games with fresh samples).
- **The family record only seeds presets when the collection is empty** (first family sign-in). Existing family phones won't see the new game: add it once on any signed-in phone via Settings › Games › Add a game, and it syncs.

## Report template

```
Added preset: <Name> (id <slug>)
- goal: <score|rounds|wins|open>, target <n|null>, lowWins <bool>, roundsPerPlayer <bool?>, because <how the rulebook ends it>
- core tests: <p passed>; typecheck: <pass>
- reaches: new installs + Reset demo; family: add via Settings › Games (record already seeded)
```

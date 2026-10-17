// @vitest-environment node
/**
 * firestore.rules against the Firestore emulator. Skipped unless FIRESTORE_EMULATOR_HOST is set,
 * which `pnpm test:rules` does (firebase emulators:exec). Needs Java, so it runs in CI.
 */
import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const RULES = readFileSync(new URL('../../../../firestore.rules', import.meta.url), 'utf8')
const NOW = '2026-10-15T19:00:00.000Z'

const player = (over: Record<string, unknown> = {}) => ({
  id: 'kate',
  name: 'Kate',
  color: 2,
  updatedAt: NOW,
  ...over,
})

const preset = (over: Record<string, unknown> = {}) => ({
  id: 'flip-7',
  name: 'Flip 7',
  goal: 'score',
  target: 200,
  lowWins: false,
  updatedAt: NOW,
  ...over,
})

const game = (over: Record<string, unknown> = {}) => ({
  id: 'g1',
  name: 'Flip 7',
  goal: 'score',
  target: 200,
  lowWins: false,
  playerIds: ['kate', 'blair', 'alder'],
  startedAt: NOW,
  completedAt: null,
  winnerId: null,
  startedBy: 'blair',
  updatedAt: NOW,
  rounds: { 'g1-r1': { scores: { kate: 10, blair: 20, alder: null }, at: NOW, by: 'blair' } },
  ...over,
})

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('firestore.rules', () => {
  let env: RulesTestEnvironment
  let blair: RulesTestContext
  let stranger: RulesTestContext
  let anon: RulesTestContext

  const db = (ctx: RulesTestContext) => ctx.firestore()
  const seed = (path: string, data: Record<string, unknown>) =>
    env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(path).set(data)
    })

  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-tally', firestore: { rules: RULES } })
  })
  afterAll(async () => {
    await env?.cleanup()
  })
  beforeEach(async () => {
    await env.clearFirestore()
    await seed('members/blair@example.com', { name: 'Blair', playerId: 'blair' })
    // Mixed case in the token: membership is looked up by the lowercased email.
    blair = env.authenticatedContext('uid-blair', { email: 'Blair@Example.com' })
    stranger = env.authenticatedContext('uid-stranger', { email: 'stranger@example.com' })
    anon = env.unauthenticatedContext()
  })

  describe('non-members', () => {
    it('are denied everything', async () => {
      await seed('players/kate', player())
      await seed('presets/flip-7', preset())
      await seed('games/g1', game())
      for (const ctx of [stranger, anon]) {
        await assertFails(db(ctx).doc('players/kate').get())
        await assertFails(db(ctx).collection('players').get())
        await assertFails(db(ctx).doc('presets/flip-7').get())
        await assertFails(db(ctx).collection('games').get())
        await assertFails(
          db(ctx)
            .doc('players/alder')
            .set(player({ id: 'alder', name: 'A' })),
        )
        await assertFails(
          db(ctx)
            .doc('presets/p2')
            .set(preset({ id: 'p2' })),
        )
        await assertFails(
          db(ctx)
            .doc('games/g2')
            .set(game({ id: 'g2' })),
        )
        await assertFails(db(ctx).doc('presets/flip-7').delete())
        await assertFails(db(ctx).doc('members/blair@example.com').get())
      }
    })

    it('a stranger may look up their own (missing) members doc, and nobody else’s', async () => {
      await assertSucceeds(db(stranger).doc('members/stranger@example.com').get())
      await assertFails(db(stranger).doc('members/blair@example.com').get())
      await assertFails(db(anon).doc('members/stranger@example.com').get())
    })
  })

  describe('members', () => {
    it('can read their own members doc but not list or write members', async () => {
      await assertSucceeds(db(blair).doc('members/blair@example.com').get())
      await assertFails(db(blair).collection('members').get())
      await assertFails(
        db(blair).doc('members/blair@example.com').set({ name: 'B', playerId: 'b' }),
      )
      await assertFails(db(blair).doc('members/blair@example.com').update({ name: 'Boss' }))
      await assertFails(db(blair).doc('members/blair@example.com').delete())
      await assertFails(db(blair).doc('members/eve@example.com').set({ name: 'E', playerId: 'e' }))
    })

    it('players: create, read, update and archive valid shapes; never delete', async () => {
      const ref = db(blair).doc('players/kate')
      await assertSucceeds(ref.set(player()))
      await assertSucceeds(ref.get())
      await assertSucceeds(db(blair).collection('players').get())
      await assertSucceeds(ref.update({ name: 'Katie', updatedAt: NOW }))
      await assertSucceeds(ref.set(player({ archived: true }), { merge: true }))
      await assertFails(ref.delete())
    })

    it('players: malformed docs are rejected', async () => {
      const ref = db(blair).doc('players/kate')
      await assertFails(ref.set(player({ id: 'someone-else' })))
      await assertFails(ref.set(player({ name: '' })))
      await assertFails(ref.set(player({ name: 'x'.repeat(17) })))
      await assertFails(ref.set(player({ color: 8 })))
      await assertFails(ref.set(player({ color: 1.5 })))
      await assertFails(ref.set(player({ archived: 'yes' })))
      await assertFails(ref.set(player({ admin: true })))
      const { updatedAt: _, ...noStamp } = player()
      await assertFails(ref.set(noStamp))
    })

    it('presets: full CRUD for valid shapes, including delete', async () => {
      const ref = db(blair).doc('presets/flip-7')
      await assertSucceeds(ref.set(preset()))
      await assertSucceeds(
        db(blair)
          .doc('presets/open')
          .set(preset({ id: 'open', goal: 'open', target: null })),
      )
      await assertSucceeds(ref.update({ target: 300, updatedAt: NOW }))
      await assertSucceeds(ref.get())
      await assertSucceeds(ref.delete())
    })

    it('presets: malformed docs are rejected', async () => {
      const ref = db(blair).doc('presets/flip-7')
      await assertFails(ref.set(preset({ goal: 'fastest' })))
      await assertFails(ref.set(preset({ target: 0 })))
      await assertFails(ref.set(preset({ target: -5 })))
      await assertFails(ref.set(preset({ target: 2.5 })))
      await assertFails(ref.set(preset({ target: '200' })))
      await assertFails(ref.set(preset({ lowWins: 'no' })))
      await assertFails(ref.set(preset({ name: 'x'.repeat(33) })))
      await assertFails(ref.set(preset({ extra: 1 })))
    })

    it('games: create, add rounds, finish and soft-delete valid shapes', async () => {
      const ref = db(blair).doc('games/g1')
      await assertSucceeds(ref.set(game()))
      await assertSucceeds(ref.get())
      await assertSucceeds(db(blair).collection('games').get())
      await assertSucceeds(
        ref.update({
          'rounds.g1-r2': { scores: { kate: 5, blair: 1, alder: 2 }, at: NOW, by: 'blair' },
          updatedAt: NOW,
        }),
      )
      await assertSucceeds(
        db(blair)
          .doc('games/g2')
          .set(game({ id: 'g2', goal: 'open', target: null, rounds: {} })),
      )
      await assertSucceeds(ref.update({ completedAt: NOW, winnerId: 'blair', updatedAt: NOW }))
      await assertSucceeds(ref.update({ deletedAt: NOW, updatedAt: NOW }))
    })

    it('games: malformed docs are rejected', async () => {
      const ref = db(blair).doc('games/g1')
      await assertFails(ref.set(game({ id: 'nope' })))
      await assertFails(ref.set(game({ name: '' })))
      await assertFails(ref.set(game({ name: 'x'.repeat(41) })))
      await assertFails(ref.set(game({ goal: 'fastest' })))
      await assertFails(ref.set(game({ target: 0 })))
      await assertFails(ref.set(game({ playerIds: ['kate'] })))
      await assertFails(ref.set(game({ playerIds: Array.from({ length: 13 }, (_, i) => `p${i}`) })))
      await assertFails(ref.set(game({ rounds: [] })))
      await assertFails(ref.set(game({ completedAt: 7 })))
      await assertFails(ref.set(game({ winnerId: 3 })))
      await assertFails(ref.set(game({ lowWins: 1 })))
      await assertFails(ref.set(game({ hacked: true })))
      const { rounds: _, ...noRounds } = game()
      await assertFails(ref.set(noRounds))
    })

    it('games: a hard delete is denied, a soft delete is allowed', async () => {
      await seed('games/g1', game())
      const ref = db(blair).doc('games/g1')
      await assertFails(ref.delete())
      await assertSucceeds(ref.update({ deletedAt: NOW, updatedAt: NOW }))
    })

    it('games: a crowned game refuses a late round or any other change', async () => {
      await seed('games/g1', game({ completedAt: NOW, winnerId: 'blair' }))
      const ref = db(blair).doc('games/g1')
      await assertFails(
        ref.update({
          'rounds.g1-r2': { scores: { kate: 50, blair: 0, alder: 0 }, at: NOW, by: 'kate' },
          updatedAt: NOW,
        }),
      )
      await assertFails(ref.update({ winnerId: 'kate', updatedAt: NOW }))
      await assertFails(ref.update({ completedAt: null, updatedAt: NOW }))
      await assertFails(ref.update({ name: 'Renamed', updatedAt: NOW }))
      await assertSucceeds(ref.update({ deletedAt: NOW, updatedAt: NOW }))
    })
  })
})

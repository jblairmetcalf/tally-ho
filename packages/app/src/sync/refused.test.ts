import { describe, expect, it } from 'vitest'
import { COPY } from '../copy'
import { reactToRejection } from '../store'
import { FakeBackend } from './fake'
import { KATE, phone, seedFamily } from './testkit'

const settle = async (n = 20) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 25))
}

describe('a game the family record refuses', () => {
  it('says it couldn\'t be saved (not "ended on another phone") and goes home', async () => {
    const backend = new FakeBackend()
    seedFamily(backend)
    // Rules from before "Who won?" existed: refuse any goal they don't know.
    backend.rules = ({ write, after }) => !(write.col === 'games' && after && after.goal === 'wins')
    const p = phone(backend, KATE)
    p.provider.onRejected((r) => reactToRejection(p.a, r))
    p.store.subscribe(() => {})
    await settle(2)

    p.a.startGame({
      name: 'Monopoly Deal',
      goal: 'wins',
      target: 1,
      lowWins: false,
      playerIds: ['kate', 'blair'],
    })
    await settle()

    expect(p.data().active).toBeNull()
    expect(p.s().screen).toBe('home')
    expect(p.s().toast?.msg).toBe(COPY.toast.gameRefused('Monopoly Deal'))
    p.dispose()
  })

  it('a score game on the same rules is kept', async () => {
    const backend = new FakeBackend()
    seedFamily(backend)
    backend.rules = ({ write, after }) => !(write.col === 'games' && after && after.goal === 'wins')
    const p = phone(backend, KATE)
    p.provider.onRejected((r) => reactToRejection(p.a, r))
    p.store.subscribe(() => {})
    await settle(2)
    p.a.startGame({
      name: 'Flip 7',
      goal: 'score',
      target: 200,
      lowWins: false,
      playerIds: ['kate', 'blair'],
    })
    await settle()
    expect(p.data().active?.name).toBe('Flip 7')
    p.dispose()
  })
})

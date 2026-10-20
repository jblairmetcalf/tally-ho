import { type Game, leadersOf, rng, type Store } from '@tally/core'
import { describe, expect, it } from 'vitest'
import { gameFrom, playerFrom, presetFrom, splitGames } from './docs'
import { FakeBackend, finishedGamesAreFinal } from './fake'
import { BLAIR, KATE, type Phone, phone, seedFamily, settle } from './testkit'

const RUNS = 50
const ACTIONS = 30
const NAMES = ['Sam', 'Robin', 'Jo', 'Ash', 'Kai']
const PRESET_NAMES = ['Uno', 'Hearts', 'Quick one', 'Farkle']

/** The synced part of a store, in a canonical order (player/preset order is device-local). */
function synced(s: Store) {
  const byId = <T extends { id: string }>(xs: T[]) =>
    xs.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return {
    players: byId(s.players),
    presets: byId(s.presets),
    active: s.active,
    games: s.games,
  }
}

/** What the server holds, read the same way the provider reads it. */
function serverView(backend: FakeBackend) {
  const docs = (col: string) => [...(backend.docs.get(col) ?? [])]
  const { active, games } = splitGames(
    docs('games')
      .map(([id, d]) => gameFrom(id, d))
      .filter((g): g is Game => !!g),
  )
  return synced({
    version: 3,
    players: docs('players').flatMap(([id, d]) => playerFrom(id, d) ?? []),
    presets: docs('presets').flatMap(([id, d]) => presetFrom(id, d) ?? []),
    active,
    games,
    lastPlayerIds: [],
    prefs: { theme: 'system', muted: false, haptics: true, wakeLock: true, installHintSeen: false },
    hasSamples: false,
  })
}

async function act(p: Phone, r: () => number, pick: <T>(xs: T[]) => T | undefined) {
  const d = p.data()
  const a = p.a
  const live = d.players.filter((x) => !x.archived)
  const score = () => String(Math.floor(r() * 40) - 5)
  // Weighted, so games actually get played to the end and the phones collide on them.
  const weights = [
    d.active ? 0.3 : 4,
    3,
    3,
    3,
    1,
    0.5,
    1,
    0.3,
    0.4,
    0.6,
    0.5,
    0.5,
    0.4,
    0.6,
    0.3,
    1.6,
  ]
  let roll = r() * weights.reduce((x, y) => x + y, 0)
  let choice = 0
  while (choice < weights.length - 1 && roll >= weights[choice]!) roll -= weights[choice++]!
  switch (choice) {
    case 0: {
      if (live.length < 2) return
      const n = 2 + Math.floor(r() * Math.min(2, live.length - 1))
      const ids = live
        .slice()
        .sort(() => r() - 0.5)
        .slice(0, n)
        .map((x) => x.id)
      const goal = pick(['score', 'rounds', 'wins', 'open'] as const)!
      a.startGame({
        name: pick(PRESET_NAMES)!,
        goal,
        target: goal === 'open' ? null : goal === 'rounds' ? 3 : goal === 'wins' ? 2 : 50,
        lowWins: r() < 0.2,
        playerIds: ids,
      })
      return
    }
    case 1:
    case 2:
    case 3:
      // "Who won?" games are scored by tapping the winner (1 for them, 0 for the rest).
      if (d.active?.goal === 'wins') a.submitWinner(pick(d.active.playerIds)!)
      else if (d.active) a.submitRound(d.active.playerIds.map(score))
      return
    case 4:
      if (d.active?.rounds.length) {
        const idx = Math.floor(r() * d.active.rounds.length)
        a.saveRound(idx, d.active.playerIds.map(score))
      }
      return
    case 5:
      if (d.active?.rounds.length) a.deleteRound(Math.floor(r() * d.active.rounds.length))
      return
    case 6: {
      // Sometimes settle a tie by the game's tiebreak: crown one of the tied leaders.
      const tied = d.active?.rounds.length ? leadersOf(d.active) : []
      if (tied.length > 1 && r() < 0.5) a.crownWinner(pick(tied)!)
      else a.endGame()
      return
    }
    case 7:
      if (d.active) a.discardGame()
      return
    case 8: {
      const g = pick(d.games)
      if (g) a.deleteGame(g.id)
      return
    }
    case 9:
      a.upsertPlayer(pick(NAMES)!)
      return
    case 10: {
      const x = pick(d.players)
      if (x) a.renamePlayer(x.id, `${pick(NAMES)}${Math.floor(r() * 9)}`)
      return
    }
    case 11: {
      const x = pick(d.players)
      if (x) a.setPlayerColor(x.id, Math.floor(r() * 8))
      return
    }
    case 12: {
      const x = pick(live)
      if (x && live.length > 2) a.archivePlayer(x.id)
      return
    }
    case 13: {
      const goal = pick(['score', 'rounds', 'wins', 'open'] as const)!
      const existing = r() < 0.5 ? pick(d.presets) : undefined
      // Absent, on or off: turning it off on an edited preset clears the field (DELETE).
      const perPlayer = r()
      a.upsertPreset({
        id: existing?.id ?? `p${Math.floor(r() * 5)}`,
        name: pick(PRESET_NAMES)!,
        goal,
        target: goal === 'open' ? null : 1 + Math.floor(r() * 90),
        lowWins: r() < 0.5,
        ...(goal === 'rounds' && perPlayer < 0.6 ? { roundsPerPlayer: perPlayer < 0.4 } : {}),
        // Player limits: absent, a fewest only, or both (Most a number or "no limit").
        ...pick([
          {},
          { minPlayers: 2 + Math.floor(r() * 4) },
          {
            minPlayers: 2 + Math.floor(r() * 4),
            maxPlayers: r() < 0.5 ? null : 2 + Math.floor(r() * 6),
          },
        ]),
      })
      return
    }
    case 14: {
      const x = pick(d.presets)
      if (x) a.deletePreset(x.id)
      return
    }
    case 15:
      p.db.setOffline(!p.db.offline)
      return
  }
}

describe('two phones, random play, random connectivity', () => {
  it(`converge to the same family record (${RUNS} runs × ${ACTIONS} actions)`, async () => {
    for (let run = 1; run <= RUNS; run++) {
      const r = rng(run * 7919)
      const pick = <T>(xs: T[]) => (xs.length ? xs[Math.floor(r() * xs.length)] : undefined)
      const backend = new FakeBackend()
      backend.rules = finishedGamesAreFinal
      seedFamily(backend)
      const phones = [phone(backend, KATE, 0), phone(backend, BLAIR, 1000)]
      try {
        await settle()
        for (let i = 0; i < ACTIONS; i++) {
          await act(pick(phones)!, r, pick)
          // Sometimes let the network catch up; sometimes pile actions up in one tick.
          if (r() < 0.5) await settle(Math.ceil(r() * 4))
        }
        for (const p of phones) p.db.setOffline(false)
        await settle(60)
        for (const p of phones) expect(p.db.pendingCount).toBe(0)
        const server = serverView(backend)
        const [k, b] = phones.map((p) => synced(p.data()))
        expect(k, `run ${run}: Kate's phone vs the server`).toEqual(server)
        expect(b, `run ${run}: Blair's phone vs the server`).toEqual(server)
      } finally {
        for (const p of phones) p.dispose()
      }
    }
  }, 60_000)
})

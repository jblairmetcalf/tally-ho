import { DEFAULT_PRESETS, emptyStore, freshStore, type Store, totalsOf } from '@tally/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COPY } from './copy'
import { createEffects } from './effects'
import { fixedClock, SCENARIOS } from './fixtures'
import { memoryProvider } from './provider'
import {
  createTallyStore,
  GAME_AFTER_MS,
  type NewGameConfig,
  PACK_FIRST_MS,
  PACK_STEP_MS,
} from './store'

const P = ['kate', 'blair', 'alder']

function setup(initial: Store = emptyStore()) {
  const provider = memoryProvider(initial)
  const store = createTallyStore(provider, fixedClock, {
    effects: createEffects({ silent: true, scroll: false }),
  })
  const a = store.getState().actions
  const s = () => store.getState()
  return { store, a, s, provider }
}

const flip7: NewGameConfig = {
  name: 'Flip 7',
  goal: 'score',
  target: 200,
  lowWins: false,
  playerIds: P,
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('starting a game', () => {
  it('clears the samples, opens the game and calls it after 250ms', () => {
    const { a, s } = setup(freshStore(fixedClock))
    expect(s().data.games).toHaveLength(10)
    a.startGame(flip7)
    expect(s().sheet).toEqual({ type: 'game' })
    expect(s().data.active?.name).toBe('Flip 7')
    expect(s().data.games).toHaveLength(0)
    expect(s().data.hasSamples).toBe(false)
    expect(s().banner).toBeNull()
    vi.advanceTimersByTime(250)
    expect(s().banner).toMatchObject({ text: COPY.banner.start('Flip 7'), tone: 'amber' })
    vi.advanceTimersByTime(1250)
    expect(s().toast?.msg).toBe(COPY.toast.samplesClearedStart)
  })

  it('from New game: that sheet slides away first, then the game rises in its own sheet', () => {
    const { a, s } = setup()
    a.openSheet({ type: 'new' })
    a.startGame(flip7)
    expect(s().sheet).toBeNull() // New game closing
    expect(s().data.active?.name).toBe('Flip 7')
    vi.advanceTimersByTime(GAME_AFTER_MS)
    expect(s().sheet).toEqual({ type: 'game' })
    expect(s().banner).toBeNull()
    vi.advanceTimersByTime(250)
    expect(s().banner?.text).toBe(COPY.banner.start('Flip 7'))
  })

  it('Resume opens the game sheet (from Home, or from New game after it closes); closing keeps the game', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    vi.runAllTimers()
    a.closeSheet()
    expect(s().sheet).toBeNull()
    expect(s().data.active?.name).toBe('Flip 7') // still live
    expect(s().screen).toBe('home')
    a.resume()
    expect(s().sheet).toEqual({ type: 'game' })
    a.closeSheet()
    a.openSheet({ type: 'new' })
    a.resume()
    expect(s().sheet).toBeNull()
    vi.advanceTimersByTime(GAME_AFTER_MS)
    expect(s().sheet).toEqual({ type: 'game' })
  })

  it('Edit round and End game are pages inside the game sheet; saving goes back to the scoreboard', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    a.submitRound(['10', '5', '0'])
    a.gamePage({ type: 'round', idx: 0 })
    expect(s().sheet).toEqual({ type: 'game', page: { type: 'round', idx: 0 } })
    a.saveRound(0, ['12', '5', '0'])
    expect(s().sheet).toEqual({ type: 'game' })
    a.gamePage({ type: 'end' })
    a.gameBack()
    expect(s().sheet).toEqual({ type: 'game' })
    // Pages only exist inside the game sheet.
    a.closeSheet()
    a.gamePage({ type: 'end' })
    expect(s().sheet).toBeNull()
  })

  it("won't start a game its line-up can't seat (New game explains; this is the backstop)", () => {
    const { a, s } = setup()
    a.startGame({ ...flip7, name: 'The Fox in the Forest', playerIds: P })
    expect(s().data.active).toBeNull()
    // Rematch on an old three-player Fox lands here too: it says why instead of doing nothing.
    expect(s().toast?.msg).toBe('The Fox in the Forest is for exactly 2 players.')
    a.startGame({ ...flip7, name: 'High Society', playerIds: P.slice(0, 2) })
    expect(s().toast?.msg).toBe('High Society needs at least 3 players.')
    expect(s().data.active).toBeNull()
    a.startGame({ ...flip7, name: 'The Fox in the Forest', playerIds: P.slice(0, 2) })
    expect(s().data.active?.playerIds).toEqual(P.slice(0, 2))
  })

  it('remembers who played for next time', () => {
    const { a, s } = setup()
    a.startGame({ ...flip7, playerIds: ['blair', 'kate'] })
    expect(s().data.lastPlayerIds).toEqual(['blair', 'kate'])
  })
})

describe('scoring rounds', () => {
  it('banners the next round and toasts a lead change after 700ms', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    a.submitRound(['30', '10', '5'])
    vi.advanceTimersByTime(250)
    expect(s().banner?.text).toBe(COPY.banner.round(2))
    a.submitRound(['0', '40', '0'])
    vi.advanceTimersByTime(700)
    expect(s().toast?.msg).toBe(COPY.toast.takesLead('Blair'))
    expect(s().flash?.scores).toEqual({ kate: 0, blair: 40, alder: 0 })
    expect(s().foxWink).toBe(2)
  })

  it('treats blanks as zero', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    a.submitRound(['', '-', '7'])
    expect(totalsOf(s().data.active!)).toEqual({ kate: 0, blair: 0, alder: 7 })
  })

  it('toasts match point when someone crosses 85% of the target', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    a.submitRound(['100', '10', '10'])
    vi.advanceTimersByTime(700)
    a.submitRound(['75', '0', '0'])
    vi.advanceTimersByTime(700)
    expect(s().toast?.msg).toBe(COPY.toast.matchPoint(['Kate']))
  })

  it('finishes, files the game and raises the victory overlay after 500ms', () => {
    const { a, s, provider } = setup()
    a.startGame(flip7)
    a.submitRound(['150', '20', '10'])
    a.submitRound(['60', '0', '0'])
    expect(s().data.active).toBeNull()
    expect(s().data.games[0]).toMatchObject({ name: 'Flip 7', winnerId: 'kate' })
    expect(s().data.games[0]?.completedAt).toBe(new Date(fixedClock.now()).toISOString())
    expect(s().victory).toBeNull()
    expect(s().sheet).toEqual({ type: 'game' }) // the final round lands on the scoreboard
    vi.advanceTimersByTime(500)
    expect(s().victory?.winnerId).toBe('kate')
    // The sheet makes way: the overlay's buttons can't sit outside an open (modal) sheet.
    expect(s().sheet).toBeNull()
    expect(provider.saved?.games[0]?.winnerId).toBe('kate')
  })

  it('the victory sticker pack tears open and slaps its stickers down one by one', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    a.submitRound(['200', '20', '10'])
    vi.advanceTimersByTime(500)
    expect(s().pack).toEqual({ open: false, shown: 0 })
    a.openPack(3)
    expect(s().pack).toEqual({ open: true, shown: 0 })
    vi.advanceTimersByTime(PACK_FIRST_MS)
    expect(s().pack?.shown).toBe(1)
    vi.advanceTimersByTime(PACK_STEP_MS)
    expect(s().pack?.shown).toBe(2)
    // Done mid-reveal: the pack goes, and nothing more lands.
    a.victoryDone()
    vi.advanceTimersByTime(PACK_STEP_MS * 2)
    expect(s().pack).toBeNull()
  })

  it('reduced motion opens the pack all at once', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    a.submitRound(['200', '20', '10'])
    vi.advanceTimersByTime(500)
    a.openPack(4, true)
    expect(s().pack).toEqual({ open: true, shown: 4 })
    a.openPack(4) // already open: no second rip
    expect(s().pack?.shown).toBe(4)
  })

  it('calls a tiebreak when the end is level', () => {
    const { a, s } = setup()
    a.startGame({ ...flip7, goal: 'rounds', target: 1 })
    a.submitRound(['10', '10', '3'])
    expect(s().data.active).not.toBeNull()
    expect(s().toast?.msg).toBe(COPY.toast.tied)
    vi.advanceTimersByTime(250)
    expect(s().banner).toMatchObject({ text: COPY.banner.tiebreak, tone: 'coral' })
  })

  it('announces the final round of a rounds game', () => {
    const { a, s } = setup()
    a.startGame({ ...flip7, name: 'Sushi Go', goal: 'rounds', target: 3 })
    a.submitRound(['1', '2', '3'])
    a.submitRound(['1', '2', '3'])
    vi.advanceTimersByTime(250)
    expect(s().banner).toMatchObject({ text: COPY.banner.finalRound, tone: 'amber' })
  })
})

describe('lowest score wins', () => {
  const hearts: NewGameConfig = { ...flip7, name: 'Hearts', target: 100, lowWins: true }

  it('warns of danger near the bust line and crowns the lowest on a bust', () => {
    const { a, s } = setup()
    a.startGame(hearts)
    a.submitRound(['86', '5', '20'])
    vi.advanceTimersByTime(700)
    expect(s().toast?.msg).toBe(COPY.toast.danger(['Kate']))
    a.submitRound(['14', '0', '0'])
    expect(s().data.games[0]?.winnerId).toBe('blair')
  })
})

describe('editing', () => {
  it('saves and deletes rounds with toasts', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    a.submitRound(['10', '20', '30'])
    a.submitRound(['1', '2', '3'])
    a.saveRound(0, ['50', '20', '30'])
    expect(totalsOf(s().data.active!).kate).toBe(51)
    expect(s().toast?.msg).toBe(COPY.toast.roundSaved(1))
    expect(s().flash?.edit).toBe(true)
    a.deleteRound(1)
    expect(s().data.active?.rounds).toHaveLength(1)
    expect(s().toast?.msg).toBe(COPY.toast.roundDeleted(2))
  })

  it('a save that reaches the target finishes the game', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    a.submitRound(['10', '20', '30'])
    a.saveRound(0, ['250', '20', '30'])
    expect(s().data.games[0]?.winnerId).toBe('kate')
  })

  it('ends an open game by crowning the leader, and discards without filing', () => {
    const { a, s } = setup()
    a.startGame({ ...flip7, goal: 'open', target: null })
    a.submitRound(['5', '9', '1'])
    a.endGame()
    expect(s().data.games[0]?.winnerId).toBe('blair')

    a.startGame({ ...flip7, goal: 'open', target: null })
    a.discardGame()
    expect(s().data.active).toBeNull()
    expect(s().data.games).toHaveLength(1)
    expect(s().toast?.msg).toBe(COPY.toast.gameDiscarded)
  })

  it('rematches with the same table', () => {
    const { a, s } = setup()
    a.startGame({ ...flip7, lowWins: true, name: 'Skyjo', target: 100 })
    a.submitRound(['120', '1', '2'])
    const done = s().data.games[0]!
    a.rematch(done)
    expect(s().data.active).toMatchObject({ name: 'Skyjo', lowWins: true, target: 100, rounds: [] })
    expect(s().data.active?.playerIds).toEqual(P)
  })
})

describe('players and presets', () => {
  it('adds players with unique ids and the first free colour', () => {
    const { a, s } = setup()
    const id = a.upsertPlayer('Mary Jo')
    expect(id).toBe('mary-jo')
    expect(s().data.players.find((p) => p.id === id)?.color).toBe(3)
    expect(a.upsertPlayer('mary jo')).toBe('mary-jo')
    expect(s().data.players).toHaveLength(4)
  })

  it('refuses a rename onto someone else, and archiving drops them from the table', () => {
    const { a, s } = setup()
    expect(a.renamePlayer('kate', 'Blair')).toBe(false)
    expect(a.renamePlayer('kate', '  Katie ')).toBe(true)
    expect(s().data.players.find((p) => p.id === 'kate')?.name).toBe('Katie')
    a.archivePlayer('alder')
    expect(s().data.lastPlayerIds).not.toContain('alder')
    expect(a.upsertPlayer('Alder')).toBe('alder')
    expect(s().data.players.find((p) => p.id === 'alder')?.archived).toBeUndefined()
  })

  it('edits, adds and deletes presets; open games drop their target', () => {
    const { a, s } = setup()
    a.upsertPreset({ id: 'uno', name: 'Uno', goal: 'open', target: 500, lowWins: false })
    expect(s().data.presets.find((p) => p.id === 'uno')?.target).toBeNull()
    a.upsertPreset({ id: 'yahtzee', name: 'Yahtzee', goal: 'rounds', target: 13, lowWins: false })
    expect(s().data.presets.at(-1)?.name).toBe('Yahtzee')
    a.deletePreset('yahtzee')
    expect(s().data.presets.some((p) => p.id === 'yahtzee')).toBe(false)
  })

  it('a "Who won?" preset always keeps a wins target (the rules require one)', () => {
    const { a, s } = setup()
    a.upsertPreset({ id: 'spicy', name: 'Spicy', goal: 'wins', target: null, lowWins: false })
    expect(s().data.presets.find((p) => p.id === 'spicy')?.target).toBe(1)
    a.upsertPreset({ id: 'jaipur', name: 'Jaipur', goal: 'wins', target: 2, lowWins: false })
    expect(s().data.presets.find((p) => p.id === 'jaipur')?.target).toBe(2)
  })

  it("restores the built-in games to today's defaults and keeps the family's own", () => {
    const { a, s } = setup()
    a.upsertPreset({
      id: 'monopoly-deal',
      name: 'Deal',
      goal: 'open',
      target: null,
      lowWins: false,
    })
    a.deletePreset('spicy')
    a.upsertPreset({ id: 'yahtzee', name: 'Yahtzee', goal: 'rounds', target: 13, lowWins: false })
    a.restoreDefaultGames()
    const presets = s().data.presets
    expect(presets.slice(0, DEFAULT_PRESETS.length)).toEqual(DEFAULT_PRESETS)
    expect(presets.find((p) => p.id === 'monopoly-deal')).toMatchObject({ goal: 'wins', target: 1 })
    expect(presets.some((p) => p.id === 'spicy')).toBe(true)
    expect(presets.at(-1)?.name).toBe('Yahtzee')
  })

  it('keeps player limits the rules accept: 2–12, most never below fewest, null = no limit', () => {
    const { a, s } = setup()
    const base = {
      id: 'yahtzee',
      name: 'Yahtzee',
      goal: 'rounds' as const,
      target: 13,
      lowWins: false,
    }
    const get = () => s().data.presets.find((p) => p.id === 'yahtzee')
    a.upsertPreset({ ...base, minPlayers: 1, maxPlayers: 20 })
    expect(get()).toMatchObject({ minPlayers: 2, maxPlayers: 12 })
    a.upsertPreset({ ...base, minPlayers: 5, maxPlayers: 3 })
    expect(get()).toMatchObject({ minPlayers: 5, maxPlayers: 5 })
    a.upsertPreset({ ...base, minPlayers: 3, maxPlayers: null })
    expect(get()).toMatchObject({ minPlayers: 3, maxPlayers: null })
    a.upsertPreset(base) // untouched stays absent: the built-in default (if any) still applies
    expect(get()?.minPlayers).toBeUndefined()
    expect(get()?.maxPlayers).toBeUndefined()
  })

  it("uses the family's player limits when dealing, including one edited in Settings", () => {
    const { a, s } = setup()
    const fox = s().data.presets.find((p) => p.id === 'the-fox-in-the-forest')!
    a.startGame({ ...flip7, name: fox.name, playerIds: P })
    expect(s().data.active).toBeNull() // two only, by default
    a.upsertPreset({ ...fox, maxPlayers: 3 })
    a.startGame({ ...flip7, name: fox.name, playerIds: P })
    expect(s().data.active?.playerIds).toEqual(P)
  })

  it('persists prefs', () => {
    const { a, provider } = setup()
    a.setPref('theme', 'light')
    a.toggleMute()
    expect(provider.saved?.prefs).toMatchObject({ theme: 'light', muted: true })
  })
})

describe('fixtures', () => {
  it('the dead-heat household really is level at the top', () => {
    const { s } = setup(SCENARIOS.deadHeat())
    const wins: Record<string, number> = {}
    for (const g of s().data.games) wins[g.winnerId!] = (wins[g.winnerId!] ?? 0) + 1
    const top = Math.max(...Object.values(wins))
    expect(Object.values(wins).filter((w) => w === top).length).toBeGreaterThan(1)
  })
})

describe('changes from another phone (replaceData)', () => {
  it('a remote round bumps the cards quietly: flash, no toast or ribbon', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    vi.runAllTimers()
    const remote = structuredClone(s().data)
    remote.active!.rounds.push({ id: 'rx', scores: { kate: 5, blair: 9, alder: 1 } })
    a.replaceData(remote)
    expect(s().flash?.scores).toEqual({ kate: 5, blair: 9, alder: 1 })
    expect(s().toast).toBeNull()
    expect(s().banner).toBeNull()
  })

  it('every round has a stable id', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    a.submitRound(['1', '2', '3'])
    a.submitRound(['1', '2', '3'])
    const ids = s().data.active!.rounds.map((r) => r.id)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(2)
  })

  it('a game won elsewhere celebrates on a phone that is watching it', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    vi.runAllTimers()
    const remote = structuredClone(s().data)
    const g = remote.active!
    g.rounds.push({ id: 'rw', scores: { kate: 250, blair: 0, alder: 0 } })
    g.completedAt = new Date(fixedClock.now()).toISOString()
    g.winnerId = 'kate'
    remote.games = [g, ...remote.games]
    remote.active = null
    a.replaceData(remote)
    expect(s().finished?.id).toBe(g.id)
    vi.advanceTimersByTime(500)
    expect(s().victory?.winnerId).toBe('kate')
  })

  it('a game won elsewhere is a toast when you are on another screen', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    vi.runAllTimers()
    a.closeSheet() // put the game away: Home behind it
    const remote = structuredClone(s().data)
    const g = remote.active!
    g.completedAt = new Date(fixedClock.now()).toISOString()
    g.winnerId = 'blair'
    remote.games = [g, ...remote.games]
    remote.active = null
    a.replaceData(remote)
    expect(s().victory).toBeNull()
    expect(s().toast?.msg).toBe(COPY.toast.wonElsewhere('Blair', 'Flip 7'))
  })

  it('a game discarded elsewhere takes you home with a note', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    vi.runAllTimers()
    const remote = structuredClone(s().data)
    remote.active = null
    a.replaceData(remote)
    expect(s().sheet).toBeNull()
    // The note waits a moment, in case it was really a refused write (then it says so instead).
    expect(s().toast).toBeNull()
    vi.advanceTimersByTime(400)
    expect(s().toast?.msg).toBe(COPY.toast.endedElsewhere('Flip 7'))
  })

  it('a refused game says so instead of blaming another phone', () => {
    const { a, s } = setup()
    a.startGame(flip7)
    vi.runAllTimers()
    const id = s().data.active!.id
    const remote = structuredClone(s().data)
    remote.active = null
    a.replaceData(remote)
    a.gameRefused(id, 'Flip 7')
    vi.advanceTimersByTime(400)
    expect(s().toast?.msg).toBe(COPY.toast.gameRefused('Flip 7'))
  })
})

describe('Who won? and picking a tiebreak winner', () => {
  it('a single "Who won?" game ends on one tap, crowning the tapped player', () => {
    const { a, s } = setup()
    a.startGame({ ...flip7, name: 'Uno', goal: 'wins', target: 1 })
    a.submitWinner('alder')
    expect(s().data.active).toBeNull()
    expect(s().data.games[0]).toMatchObject({ name: 'Uno', winnerId: 'alder' })
    expect(s().data.games[0]?.rounds[0]?.scores).toEqual({ kate: 0, blair: 0, alder: 1 })
  })

  it('first to two wins (Jaipur) needs two taps for the same player', () => {
    const { a, s } = setup()
    a.startGame({ ...flip7, name: 'Jaipur', goal: 'wins', target: 2, playerIds: ['kate', 'blair'] })
    a.submitWinner('kate')
    a.submitWinner('blair')
    expect(s().data.active?.rounds).toHaveLength(2)
    a.submitWinner('kate')
    expect(s().data.games[0]?.winnerId).toBe('kate')
  })

  it("ignores a winner who isn't playing", () => {
    const { a, s } = setup()
    a.startGame({ ...flip7, goal: 'wins', target: 1, playerIds: ['kate', 'blair'] })
    a.submitWinner('alder')
    expect(s().data.active?.rounds).toHaveLength(0)
  })

  it('a tie can be settled by picking one of the tied leaders', () => {
    const { a, s } = setup()
    a.startGame({ ...flip7, name: 'Sushi Go', goal: 'rounds', target: 1 })
    a.submitRound(['10', '10', '3'])
    expect(s().data.active).not.toBeNull() // tied: the game waits
    a.crownWinner('alder') // not tied for the lead: ignored
    expect(s().data.active).not.toBeNull()
    a.crownWinner('blair')
    expect(s().data.games[0]?.winnerId).toBe('blair')
    vi.advanceTimersByTime(500)
    expect(s().victory?.winnerId).toBe('blair')
  })
})

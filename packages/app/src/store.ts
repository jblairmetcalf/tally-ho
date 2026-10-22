import {
  type Clock,
  DEFAULT_PRESETS,
  evaluate,
  fitsRange,
  freshStore,
  type Game,
  hash,
  keyPreview,
  leaderOf,
  leadersOf,
  MATCH_POINT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  outcomesOf,
  PALETTE_SIZE,
  type Player,
  type Prefs,
  type Preset,
  parseScore,
  rangeForGame,
  roundNotes,
  type SongKey,
  type Store,
  scheduleOf,
  slug,
  songOf,
  systemClock,
  totalsOf,
} from '@tally/core'
import type { SfxCue } from '@tally/ui'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { COPY } from './copy'
import { createEffects, type Effects } from './effects'
import type { DataProvider } from './provider'

/** The tabs. The game itself is a sheet over them (`{ type: 'game' }`), not a screen. */
export type Screen = 'home' | 'history'

/** A page pushed inside the game sheet: editing a round, or ending the game. */
export type GamePage = { type: 'round'; idx: number } | { type: 'end' }

export type SheetSpec =
  | { type: 'new' }
  /** The live (or just-finished) game, with Edit round / End game pushed inside it. */
  | { type: 'game'; page?: GamePage }
  | { type: 'detail'; id: string }
  /** A player's sticker book (decision 24); the sheet switches players inside. */
  | { type: 'stickers'; playerId?: string }
  | { type: 'settings' }
  /** How to add Tally Ho! to the Home Screen (shown once by itself, and from Settings). */
  | { type: 'install' }

/** The last scored (or edited) round, for the bump / delta / fresh-row animations. */
export interface Flash {
  k: number
  gid: string
  scores: Record<string, number | null>
  edit?: boolean
}

export type BannerTone = 'jade' | 'amber' | 'coral'

/**
 * Starting a game from New game: that sheet slides away (Sheet's 290ms close) and the game's
 * sheet rises once it's gone. Not a prototype timing (there the game was a screen).
 */
export const GAME_AFTER_MS = 300

/** The sticker pack's reveal: the first sticker lands this long after the rip, then one every step. */
export const PACK_FIRST_MS = 500
export const PACK_STEP_MS = 280

/**
 * The Fox Trot (decision 27): the victory song starts once the fanfare and the losers' sting are
 * done (`VICTORY_LOSE_MS` 2.3 s + the sting's second), so nothing overlaps. Play all pauses
 * `SONG_GAP_MS` between songs.
 */
export const SONG_AFTER_MS = 3400
export const SONG_GAP_MS = 450

/** The Fox Trot song playing: which control started it, its game, and the beat sounding (-1 the riff). */
export interface SongState {
  key: 'shelf' | 'detail' | 'victory' | 'live' | 'all' | 'preview'
  gameId: string
  /**
   * A whole song from its start (the staff lights each note as it sounds), or just one round's
   * note (`beat`: the round, lit while it sounds).
   */
  whole: boolean
  beat: number
}

export interface UiState {
  screen: Screen
  /** The open sheet. The Sheet keeps itself mounted to play its closing animation. */
  sheet: SheetSpec | null
  /** Bumped on every open so sheet content starts fresh. */
  sheetKey: number
  toast: { msg: string; k: number } | null
  banner: { text: string; tone: BannerTone; k: number } | null
  flash: Flash | null
  /** The game the victory overlay is celebrating. */
  victory: Game | null
  /**
   * The game that just finished, still on its sheet for the beat before the victory overlay
   * rises (the sheet goes as it does).
   */
  finished: Game | null
  /** Bumped after each round so the nav fox twitches. */
  foxWink: number
  /** The victory sticker pack: torn open yet, and how many of its items have slapped down. */
  pack: { open: boolean; shown: number } | null
  /** The Fox Trot song playing (one at a time, from anywhere). */
  song: SongState | null
  /** A round whose note just changed (an edit): its note pulses once. */
  pulse: { gameId: string; idx: number; k: number } | null
}

export interface NewGameConfig {
  name: string
  goal: Game['goal']
  target: number | null
  lowWins: boolean
  playerIds: string[]
}

export interface TallyActions {
  /** A UI sound (and its haptic) for interactions the store doesn't own: pills, toggles. */
  play(cue: SfxCue): void
  /** Change screen (and scroll to the top), optionally with a sound. */
  go(screen: Screen, cue?: SfxCue): void
  /** Slide a sheet up. `silent`: no sound (it wasn't a tap, e.g. the install guide's one-time pop-up). */
  openSheet(spec: SheetSpec, silent?: boolean): void
  closeSheet(silent?: boolean): void
  showToast(msg: string): void
  showBanner(text: string, tone?: BannerTone): void
  toggleMute(): void
  /** Resume the live game (Home card, nav FAB, New game's notice): its sheet slides up. */
  resume(): void
  /** The nav FAB: back to the game, or deal a new one. */
  fab(): void
  /** Push a page inside the game sheet (Edit round, End game). */
  gamePage(page: GamePage): void
  /** Back from that page to the scoreboard. */
  gameBack(): void
  victoryDone(): void
  /**
   * Tear open the victory sticker pack: the rip, then each of its `count` items slaps down
   * (PACK_STEP_MS apart, from PACK_FIRST_MS). `instant` (reduced motion): all at once, quietly.
   */
  openPack(count: number, instant?: boolean): void

  /**
   * The Fox Trot: play a game's song from a control (`key`), or stop it if that one is playing.
   * A tap plays; anything else that sounds, a sheet or a tab stops it. Nothing is stored.
   */
  playSong(gameId: string, key?: SongState['key']): void
  /** Play these games' songs back to back (the shelf's Play all), or stop. */
  playAll(gameIds: string[]): void
  stopSong(): void
  /** Hear a song key as it's picked (Settings › Games): its chord, or its loop of chords. */
  previewKey(key: SongKey, what: 'chord' | 'loop'): void
  /** Hear one round as it would sound (Edit round's preview, before saving). */
  previewRound(g: Game, idx: number): void

  startGame(cfg: NewGameConfig): void
  submitRound(vals: string[], btn?: Element | null): void
  /** "Who won?" games: the tapped player wins this round (1), everyone else 0. */
  submitWinner(playerId: string, btn?: Element | null): void
  /**
   * End a tied game by the game's own tiebreak rule: crown one of the tied leaders (the
   * alternative to playing a tiebreak round). Ignored for anyone not tied for the lead.
   */
  crownWinner(playerId: string): void
  /**
   * The family record refused a game this phone created (a rules mismatch). Says so, and stops
   * the rollback that follows from being reported as "ended on another phone".
   */
  gameRefused(gameId: string, name: string): void
  saveRound(idx: number, vals: string[]): void
  deleteRound(idx: number): void
  endGame(): void
  discardGame(): void
  deleteGame(id: string): void
  clearSamples(): void
  rematch(g: Game): void

  /** Find a player by name (bringing them back from the archive) or add them. Returns the id. */
  upsertPlayer(name: string, color?: number): string
  /** False when the name is empty or someone else already has it. */
  renamePlayer(id: string, name: string): boolean
  setPlayerColor(id: string, color: number): void
  archivePlayer(id: string): void
  upsertPreset(preset: Preset): void
  deletePreset(id: string): void
  /**
   * Put the built-in games back as they ship today (restoring any deleted ones) and leave the
   * family's own games alone. Defaults only seed new stores, so this is how an existing record
   * picks up a changed default.
   */
  restoreDefaultGames(): void
  setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void

  /** Replace the data wholesale (a remote change). */
  replaceData(s: Store): void
  dispose(): void
}

export interface TallyState extends UiState {
  data: Store
  /** Injected so stories and tests are deterministic. */
  clock: Clock
  actions: TallyActions
}

export type TallyStore = StoreApi<TallyState>

export interface CreateOptions {
  /** Starting UI state (stories open a sheet or the victory overlay). */
  ui?: Partial<UiState>
  effects?: Effects
}

const clone = <T>(o: T): T => structuredClone(o)

let roundSeq = 0
/** A round id unique across phones: time, a per-session counter and a random tail. */
function roundId(): string {
  roundSeq = (roundSeq + 1) % 1296
  return `r${Date.now().toString(36)}${roundSeq.toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 6)}`
}

/** A fresh id from a name: its slug, with -2, -3… when taken. */
export function uniqueId(base: string, taken: Iterable<string>): string {
  const set = new Set(taken)
  const root = slug(base)
  if (!set.has(root)) return root
  let n = 2
  while (set.has(`${root}-${n}`)) n++
  return `${root}-${n}`
}

/** The first palette slot no current player wears, else a stable hash slot (prototype). */
/**
 * Player limits as the rules accept them: whole numbers 2–12, the most never below the fewest,
 * `null` for no limit. Untouched (absent) stays absent, so the built-in default still applies.
 */
function limits(p: Preset): Pick<Preset, 'minPlayers' | 'maxPlayers'> {
  const clamp = (n: number) => Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(n)))
  const min = p.minPlayers == null ? undefined : clamp(p.minPlayers)
  const max =
    p.maxPlayers === undefined
      ? undefined
      : p.maxPlayers === null
        ? null
        : Math.max(min ?? MIN_PLAYERS, clamp(p.maxPlayers))
  return { minPlayers: min, maxPlayers: max }
}

function nextColor(players: Player[], name: string): number {
  const used = new Set(players.filter((p) => !p.archived).map((p) => p.color))
  for (let i = 0; i < PALETTE_SIZE; i++) if (!used.has(i)) return i
  return hash(name) % PALETTE_SIZE
}

export function createTallyStore(
  provider: DataProvider,
  clock: Clock = systemClock,
  opts: CreateOptions = {},
): TallyStore {
  const fx = opts.effects ?? createEffects()
  const initial = provider.load() ?? freshStore(clock)
  let seq = 0
  const key = () => ++seq

  const store = createStore<TallyState>()((set, get) => {
    const data = () => get().data
    const setData = (fn: (d: Store) => Store) => set((s) => ({ data: fn(s.data) }))

    const showToast = (msg: string) => {
      set({ toast: { msg, k: key() } })
      fx.timer('toast', 2600, () => set({ toast: null }))
    }
    const showBanner = (text: string, tone: BannerTone = 'jade') => {
      set({ banner: { text, tone, k: key() } })
      fx.timer('banner', 1400, () => set({ banner: null }))
    }
    // ── the Fox Trot ──
    /** Bumped whenever a song starts or stops, so a stopped song's timers do nothing. */
    let songToken = 0
    const colorOf = (id: string) =>
      data().players.find((p) => p.id === id)?.color ?? hash(id) % PALETTE_SIZE
    const findGame = (id: string) =>
      data().active?.id === id ? data().active : data().games.find((g) => g.id === id)
    const stopSong = () => {
      songToken++
      fx.stopSong()
      if (get().song) set({ song: null })
    }
    /** Sing a game's song, the playhead stepping with it; `after` when it ends. */
    function sing(g: Game, key: SongState['key'], o: { after?: () => void } = {}) {
      const token = ++songToken
      // Its ending reads how it was won, from the family's history (decision 29).
      const sched = scheduleOf(songOf(g, colorOf, outcomesOf(data().games).get(g.id)))
      fx.song(sched.notes)
      // The staff follows the song itself, note by note, from this moment.
      set({ song: { key, gameId: g.id, whole: true, beat: -1 } })
      fx.later(sched.length * 1000, () => {
        if (songToken !== token) return
        // In a run (Play all) the run plays on through the pause: no card lit, but still playing,
        // so Play all stays Stop from the first song to the last instead of flickering.
        set({ song: o.after ? { key, gameId: '', whole: true, beat: -1 } : null })
        o.after?.()
      })
    }
    /** A round's own note (scoring it, or hearing an edit): it stops any song. */
    const singRound = (g: Game, idx: number, key: SongState['key'] = 'live') => {
      const token = ++songToken
      fx.song(roundNotes(songOf(g, colorOf), idx))
      set({ song: { key, gameId: g.id, whole: false, beat: idx } })
      fx.later(400, () => {
        if (songToken === token) set({ song: null })
      })
    }

    const go = (screen: Screen, cue?: SfxCue) => {
      stopSong()
      if (cue) fx.play(cue)
      set({ screen })
      fx.scrollTop()
    }
    const openSheet = (spec: SheetSpec, silent = false) => {
      stopSong()
      // New game opens to its own tune, the sticker book to a sticker; every other sheet whooshes.
      if (!silent)
        fx.play(spec.type === 'new' ? 'deal' : spec.type === 'stickers' ? 'sticker' : 'open')
      set((s) => ({ sheet: spec, sheetKey: s.sheetKey + 1 }))
    }
    const closeSheet = (silent = false) => {
      const was = get().sheet
      if (!was) return
      stopSong()
      if (!silent) fx.play('close')
      // Leaving the game drops the flash too, so coming back doesn't replay the last round.
      set(was.type === 'game' ? { sheet: null, finished: null, flash: null } : { sheet: null })
    }
    const inGame = () => get().sheet?.type === 'game'
    /** From a page inside the game sheet back to the scoreboard (the store's own moves: silent). */
    const toScoreboard = () => {
      if (inGame()) set({ sheet: { type: 'game' } })
      else closeSheet(true)
    }
    /**
     * Bring the game up in its sheet. From another sheet (New game), that one slides away first
     * and the game rises once it's gone (GAME_AFTER_MS); already in the game (a rematch), the
     * scoreboard just starts over in place. Returns how long until the game is up.
     */
    const presentGame = (cue: SfxCue): number => {
      if (inGame()) {
        if (cue !== 'open') fx.play(cue)
        set((s) => ({ sheet: { type: 'game' }, sheetKey: s.sheetKey + 1 }))
        return 0
      }
      if (get().sheet) {
        closeSheet(true)
        fx.play(cue)
        // Unless something else came up in the meantime.
        fx.later(GAME_AFTER_MS, () => {
          if (!get().sheet && data().active) openSheet({ type: 'game' }, true)
        })
        return GAME_AFTER_MS
      }
      if (cue === 'open') openSheet({ type: 'game' })
      else {
        fx.play(cue)
        openSheet({ type: 'game' }, true)
      }
      return 0
    }

    function finish(g: Game, winnerId: string) {
      g.winnerId = winnerId
      g.completedAt = new Date(clock.now()).toISOString()
      setData((d) => ({ ...d, active: null, games: [g, ...d.games.filter((x) => x.id !== g.id)] }))
      set({ finished: g })
      fx.later(500, () => celebrate(g))
    }

    /**
     * The victory overlay. The game's sheet slides away as it rises: an open sheet is modal (it
     * holds focus and taps), so the overlay's Rematch and Done must not sit outside it.
     */
    /** `tapped`: this phone's tap finished it, so its song may follow (never for a remote win). */
    function celebrate(g: Game, tapped = true) {
      closeSheet(true)
      set({ victory: g, pack: { open: false, shown: 0 } })
      fx.play('win')
      // Then the game's song, once the fanfare and the sting are done: unless they've moved on,
      // torn the pack open, or started it themselves. Only after a tap here (a win from another
      // phone has Replay instead: nothing plays without a tap).
      if (!tapped) return
      fx.later(SONG_AFTER_MS, () => {
        const s = get()
        if (s.victory?.id === g.id && !s.pack?.open && !s.song) sing(g, 'victory')
      })
    }

    function startGame(cfg: NewGameConfig) {
      // New game won't offer it; Rematch on an older game might (a three-player Fox from before
      // the limit). Never a silent no: say why.
      const range = rangeForGame(data().presets, cfg.name)
      if (!fitsRange(range, cfg.playerIds.length)) {
        fx.play('error')
        showToast(COPY.newGame.lineupWhy(cfg.name, range.min, range.max, cfg.playerIds.length))
        return
      }
      const d = data()
      // The game type's Fox Trot key, fixed now so later edits never re-key this game's song.
      const song = d.presets.find((p) => p.name === cfg.name)?.song
      const taken = new Set([...d.games.map((x) => x.id), ...(d.active ? [d.active.id] : [])])
      let id = `g${clock.now()}`
      while (taken.has(id)) id += 'x'
      const g: Game = {
        id,
        name: cfg.name,
        goal: cfg.goal,
        target: cfg.goal === 'open' ? null : cfg.target,
        lowWins: cfg.lowWins,
        playerIds: cfg.playerIds.slice(),
        rounds: [],
        startedAt: new Date(clock.now()).toISOString(),
        completedAt: null,
        winnerId: null,
        ...(song ? { song } : {}),
      }
      const hadSamples = d.hasSamples
      setData((x) => ({
        ...x,
        active: g,
        lastPlayerIds: cfg.playerIds.slice(),
        games: x.hasSamples ? x.games.filter((y) => !y.sample) : x.games,
        hasSamples: false,
      }))
      stopSong()
      set({ victory: null, finished: null, flash: null, pack: null })
      const up = presentGame('start')
      fx.later(up + 250, () => showBanner(COPY.banner.start(cfg.name), 'amber'))
      if (hadSamples) fx.later(1500, () => showToast(COPY.toast.samplesClearedStart))
    }

    const nameOf = (id: string) => data().players.find((p) => p.id === id)?.name ?? id
    /** Games the family record refused: their rollback isn't another phone's doing. */
    const refused = new Set<string>()

    const actions: TallyActions = {
      play: (cue) => fx.play(cue),
      go,
      openSheet,
      closeSheet,
      showToast,
      showBanner,
      toggleMute() {
        const m = !data().prefs.muted
        // Unmute first so the confirming chirp is heard (TallyApp also syncs SFX from prefs).
        fx.mute(m)
        if (!m) fx.play('pick')
        setData((d) => ({ ...d, prefs: { ...d.prefs, muted: m } }))
      },
      resume() {
        if (!data().active || inGame()) return
        presentGame('open')
      },
      fab() {
        if (data().active) actions.resume()
        else openSheet({ type: 'new' })
      },
      gamePage(page) {
        if (!inGame()) return
        fx.play('open')
        set({ sheet: { type: 'game', page } })
      },
      gameBack() {
        const sh = get().sheet
        if (sh?.type !== 'game' || !sh.page) return
        fx.play('close')
        set({ sheet: { type: 'game' } })
      },
      victoryDone() {
        stopSong()
        fx.play('tap')
        // The game is over (its sheet already went): Home, with it in the history.
        set({ victory: null, finished: null, pack: null })
      },
      openPack(count, instant = false) {
        const pack = get().pack
        if (!pack || pack.open) return
        stopSong()
        fx.play('rip')
        if (instant) {
          set({ pack: { open: true, shown: count } })
          return
        }
        set({ pack: { open: true, shown: 0 } })
        for (let i = 0; i < count; i++)
          fx.later(PACK_FIRST_MS + i * PACK_STEP_MS, () => {
            // Done or Rematch mid-reveal: the rest stay in the pack, silently.
            const now = get().pack
            if (!now?.open) return
            set({ pack: { ...now, shown: i + 1 } })
            fx.play('sticker')
          })
      },

      playSong(gameId, key = 'shelf') {
        const s = get().song
        // Tapping the song that's playing stops it; a round's note isn't a song, so play starts.
        if (s?.whole && s.gameId === gameId && s.key === key) return stopSong()
        const g = findGame(gameId)
        if (!g?.rounds.length) return
        sing(g, key)
      },
      playAll(gameIds) {
        if (get().song?.key === 'all') return stopSong()
        const run = (i: number) => {
          const id = gameIds[i]
          const g = id ? findGame(id) : undefined
          // The last song is done: the run is over.
          if (!g) return set({ song: null })
          sing(g, 'all', {
            after: () => {
              const token = songToken
              fx.later(SONG_GAP_MS, () => {
                if (songToken === token) run(i + 1)
              })
            },
          })
        }
        run(0)
      },
      stopSong,
      previewKey(key, what) {
        songToken++
        if (get().song) set({ song: null })
        fx.song(keyPreview(key, what))
      },
      previewRound(g, idx) {
        singRound(g, idx, 'preview')
      },
      startGame,

      submitRound(vals, btn) {
        const active = data().active
        if (!active) return
        const g = clone(active)
        const before = leaderOf(g)
        const tb = totalsOf(g)
        const sc: Record<string, number | null> = {}
        g.playerIds.forEach((p, i) => {
          sc[p] = parseScore(vals[i])
        })
        g.rounds.push({ id: roundId(), scores: sc, at: new Date(clock.now()).toISOString() })
        // The round's own note in the game's song (the Fox Trot), in place of `submit`.
        singRound(g, g.rounds.length - 1)
        fx.buzz('submit')
        fx.burstFrom(btn, 22, { power: 9, spread: 1.6 })
        set((s) => ({ flash: { k: key(), gid: g.id, scores: sc }, foxWink: s.foxWink + 1 }))
        const res = evaluate(g)
        if (res.done) {
          finish(g, res.winner)
          return
        }
        setData((d) => ({ ...d, active: g }))
        const n = g.rounds.length + 1
        if (res.tie) {
          fx.later(250, () => {
            fx.play('tie')
            showBanner(COPY.banner.tiebreak, 'coral')
          })
          showToast(COPY.toast.tied)
          return
        }
        if (g.goal === 'rounds' && n === g.target)
          fx.later(250, () => showBanner(COPY.banner.finalRound, 'amber'))
        else fx.later(250, () => showBanner(COPY.banner.round(n)))
        const after = leaderOf(g)
        const ta = totalsOf(g)
        if (after && after !== before && g.rounds.length > 1) {
          fx.later(700, () => {
            fx.play('lead')
            showToast(COPY.toast.takesLead(nameOf(after)))
          })
        } else if (g.goal === 'score' && g.target != null) {
          const line = g.target * MATCH_POINT
          const m = g.playerIds.filter((p) => (ta[p] ?? 0) >= line && (tb[p] ?? 0) < line)
          if (m.length) {
            const names = m.map(nameOf)
            fx.later(700, () => {
              fx.play('match')
              showToast(g.lowWins ? COPY.toast.danger(names) : COPY.toast.matchPoint(names))
            })
          }
        }
      },

      gameRefused(gameId, name) {
        refused.add(gameId)
        fx.play('error')
        showToast(COPY.toast.gameRefused(name))
      },

      submitWinner(playerId, btn) {
        const active = data().active
        if (!active?.playerIds.includes(playerId)) return
        actions.submitRound(
          active.playerIds.map((p) => (p === playerId ? '1' : '0')),
          btn,
        )
      },

      crownWinner(playerId) {
        const active = data().active
        if (!active?.rounds.length || !leadersOf(active).includes(playerId)) return
        toScoreboard()
        finish(clone(active), playerId)
      },

      saveRound(idx, vals) {
        const active = data().active
        const round = active?.rounds[idx]
        if (!active || !round) return
        const g = clone(active)
        const r = g.rounds[idx]!
        g.playerIds.forEach((p, i) => {
          r.scores[p] = parseScore(vals[i])
        })
        toScoreboard()
        fx.play('submit')
        set({
          flash: { k: key(), gid: g.id, scores: r.scores, edit: true },
          pulse: { gameId: g.id, idx, k: key() },
        })
        fx.timer('pulse', 700, () => set({ pulse: null }))
        const res = evaluate(g)
        if (res.done) {
          finish(g, res.winner)
          return
        }
        setData((d) => ({ ...d, active: g }))
        showToast(COPY.toast.roundSaved(idx + 1))
      },

      deleteRound(idx) {
        const active = data().active
        if (!active) return
        const g = clone(active)
        g.rounds.splice(idx, 1)
        toScoreboard()
        fx.play('del')
        setData((d) => ({ ...d, active: g }))
        showToast(COPY.toast.roundDeleted(idx + 1))
      },

      endGame() {
        const active = data().active
        if (!active) return
        const g = clone(active)
        const l = leadersOf(g)
        toScoreboard()
        if (l.length === 1 && l[0] && g.rounds.length) finish(g, l[0])
      },

      discardGame() {
        closeSheet(true)
        fx.play('del')
        setData((d) => ({ ...d, active: null }))
        showToast(COPY.toast.gameDiscarded)
      },

      deleteGame(id) {
        closeSheet(true)
        fx.play('del')
        setData((d) => ({ ...d, games: d.games.filter((g) => g.id !== id) }))
        showToast(COPY.toast.gameDeleted)
      },

      clearSamples() {
        fx.play('del')
        setData((d) => ({ ...d, games: d.games.filter((g) => !g.sample), hasSamples: false }))
        showToast(COPY.toast.samplesCleared)
      },

      rematch(g) {
        startGame({
          name: g.name,
          goal: g.goal,
          target: g.target,
          lowWins: g.lowWins,
          playerIds: g.playerIds,
        })
      },

      upsertPlayer(raw, color) {
        const name = raw.trim().slice(0, 16)
        const d = data()
        const found = d.players.find((p) => p.name.toLowerCase() === name.toLowerCase())
        if (found) {
          if (found.archived || (color != null && color !== found.color)) {
            setData((x) => ({
              ...x,
              players: x.players.map((p) =>
                p.id === found.id
                  ? {
                      id: p.id,
                      name: p.name,
                      color: color ?? (p.archived ? nextColor(x.players, p.name) : p.color),
                    }
                  : p,
              ),
            }))
          }
          return found.id
        }
        const id = uniqueId(
          name,
          d.players.map((p) => p.id),
        )
        const player: Player = { id, name, color: color ?? nextColor(d.players, name) }
        setData((x) => ({ ...x, players: [...x.players, player] }))
        return id
      },

      renamePlayer(id, raw) {
        const name = raw.trim().slice(0, 16)
        if (!name) return false
        const d = data()
        if (d.players.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase()))
          return false
        setData((x) => ({
          ...x,
          players: x.players.map((p) => (p.id === id ? { ...p, name } : p)),
        }))
        return true
      },

      setPlayerColor(id, color) {
        const c = ((Math.round(color) % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE
        setData((x) => ({
          ...x,
          players: x.players.map((p) => (p.id === id ? { ...p, color: c } : p)),
        }))
      },

      archivePlayer(id) {
        setData((x) => ({
          ...x,
          players: x.players.map((p) => (p.id === id ? { ...p, archived: true } : p)),
          lastPlayerIds: x.lastPlayerIds.filter((p) => p !== id),
        }))
      },

      upsertPreset(preset) {
        const p: Preset = {
          ...preset,
          name: preset.name.trim().slice(0, 32) || COPY.settings.newGameName,
          // Open games have no target; "Who won?" always needs one (≥ 1 win), or the family's
          // rules refuse the write and the preset never leaves this phone.
          target:
            preset.goal === 'open'
              ? null
              : preset.goal === 'wins'
                ? Math.max(1, preset.target ?? 1)
                : preset.target,
          ...limits(preset),
        }
        setData((x) => ({
          ...x,
          presets: x.presets.some((q) => q.id === p.id)
            ? x.presets.map((q) => (q.id === p.id ? p : q))
            : [...x.presets, p],
        }))
      },

      deletePreset(id) {
        setData((x) => ({ ...x, presets: x.presets.filter((p) => p.id !== id) }))
      },

      restoreDefaultGames() {
        const ids = new Set(DEFAULT_PRESETS.map((p) => p.id))
        setData((x) => ({
          ...x,
          presets: [
            ...DEFAULT_PRESETS.map((p) => ({ ...p })),
            ...x.presets.filter((p) => !ids.has(p.id)),
          ],
        }))
      },

      setPref(k, value) {
        setData((x) => ({ ...x, prefs: { ...x.prefs, [k]: value } }))
      },

      replaceData(next) {
        // A change from elsewhere (another phone, another tab). React to what it means for the
        // game on screen, quietly: toasts and ribbons belong to the phone that scored.
        const cur = get()
        const was = cur.data.active
        set({ data: next })
        if (!was) return
        const now = next.active
        if (now?.id === was.id) {
          const last = now.rounds.at(-1)
          if (now.rounds.length > was.rounds.length && last)
            set({ flash: { k: key(), gid: now.id, scores: last.scores } })
          return
        }
        const done = next.games.find((g) => g.id === was.id && g.completedAt && g.winnerId)
        if (done?.winnerId) {
          const watching = cur.sheet?.type === 'game' && !cur.victory
          if (watching) {
            set({ finished: done })
            fx.later(500, () => celebrate(done, false))
          } else {
            fx.play('pick')
            showToast(COPY.toast.wonElsewhere(nameOf(done.winnerId), done.name))
          }
          return
        }
        if (!now && cur.sheet?.type === 'game' && !cur.finished) {
          closeSheet(true)
          // A refused write rolls the game back the same way; its rejection can land just
          // before or after this snapshot, so wait a moment before blaming another phone.
          fx.later(400, () => {
            if (!refused.has(was.id)) showToast(COPY.toast.endedElsewhere(was.name))
          })
        }
      },

      dispose() {
        songToken++
        fx.stopSong()
        fx.dispose()
        unsubRemote?.()
        unsubSave?.()
      },
    }

    return {
      data: initial,
      clock,
      screen: 'home',
      // A game in progress opens straight into its scoreboard, as it always has.
      sheet: initial.active ? { type: 'game' } : null,
      sheetKey: 0,
      toast: null,
      banner: null,
      flash: null,
      victory: null,
      finished: null,
      foxWink: 0,
      pack: null,
      song: null,
      pulse: null,
      ...opts.ui,
      actions,
    }
  })

  let remote = false
  const unsubSave: (() => void) | undefined = store.subscribe((s, prev) => {
    if (s.data !== prev.data && !remote) provider.save(s.data)
  })
  const unsubRemote = provider.subscribe?.((s) => {
    remote = true
    try {
      store.getState().actions.replaceData(s)
    } finally {
      remote = false
    }
  })

  return store
}

/**
 * What the app says when the family record refuses a write: a new game refused outright
 * (usually the family's rules predate this app) vs. a late change to a finished game.
 */
export function reactToRejection(
  actions: TallyActions,
  { op }: { op: { col: string; type: string; id: string; data?: Record<string, unknown> } },
): void {
  if (op.col === 'games' && op.type === 'set')
    actions.gameRefused(op.id, typeof op.data?.name === 'string' ? op.data.name : op.id)
  else actions.showToast(COPY.toast.syncRejected)
}

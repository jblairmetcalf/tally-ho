import {
  type Clock,
  DEFAULT_PRESETS,
  evaluate,
  freshStore,
  type Game,
  hash,
  leaderOf,
  leadersOf,
  MATCH_POINT,
  PALETTE_SIZE,
  type Player,
  type Prefs,
  type Preset,
  parseScore,
  type Store,
  slug,
  systemClock,
  totalsOf,
} from '@tally/core'
import type { SfxCue } from '@tally/ui'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { COPY } from './copy'
import { createEffects, type Effects } from './effects'
import type { DataProvider } from './provider'

export type Screen = 'home' | 'history' | 'game'

export type SheetSpec =
  | { type: 'new' }
  | { type: 'round'; idx: number }
  | { type: 'end' }
  | { type: 'detail'; id: string }
  | { type: 'settings' }
  | { type: 'signin' }
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
  /** A just-finished game still on screen behind the overlay. */
  finished: Game | null
  /** Bumped after each round so the nav fox twitches. */
  foxWink: number
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
  /** Resume the live game (Home card, nav FAB). */
  resume(): void
  /** The nav FAB: back to the game, or deal a new one. */
  fab(): void
  backFromGame(): void
  victoryDone(): void

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
export function nextColor(players: Player[], name: string): number {
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
    const go = (screen: Screen, cue?: SfxCue) => {
      if (cue) fx.play(cue)
      set({ screen })
      fx.scrollTop()
    }
    const openSheet = (spec: SheetSpec, silent = false) => {
      if (!silent) fx.play('open')
      set((s) => ({ sheet: spec, sheetKey: s.sheetKey + 1 }))
    }
    const closeSheet = (silent = false) => {
      if (!get().sheet) return
      if (!silent) fx.play('close')
      set({ sheet: null })
    }

    function finish(g: Game, winnerId: string) {
      g.winnerId = winnerId
      g.completedAt = new Date(clock.now()).toISOString()
      setData((d) => ({ ...d, active: null, games: [g, ...d.games.filter((x) => x.id !== g.id)] }))
      set({ finished: g })
      fx.later(500, () => {
        set({ victory: g })
        fx.play('win')
      })
    }

    function startGame(cfg: NewGameConfig) {
      const d = data()
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
      }
      const hadSamples = d.hasSamples
      setData((x) => ({
        ...x,
        active: g,
        lastPlayerIds: cfg.playerIds.slice(),
        games: x.hasSamples ? x.games.filter((y) => !y.sample) : x.games,
        hasSamples: false,
      }))
      closeSheet(true)
      set({ victory: null, finished: null, flash: null })
      go('game')
      fx.play('start')
      fx.later(250, () => showBanner(COPY.banner.start(cfg.name), 'amber'))
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
        fx.play('pick')
        go('game')
      },
      fab() {
        if (data().active) actions.resume()
        else openSheet({ type: 'new' })
      },
      backFromGame() {
        fx.play('tap')
        // Drop the flash too, so coming back doesn't replay the last round's animations.
        set({ finished: null, flash: null })
        go('home')
      },
      victoryDone() {
        fx.play('tap')
        set({ victory: null, finished: null })
        go('home')
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
        fx.play('submit')
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
        closeSheet(true)
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
        closeSheet(true)
        fx.play('submit')
        set({ flash: { k: key(), gid: g.id, scores: r.scores, edit: true } })
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
        closeSheet(true)
        fx.play('del')
        setData((d) => ({ ...d, active: g }))
        showToast(COPY.toast.roundDeleted(idx + 1))
      },

      endGame() {
        const active = data().active
        if (!active) return
        const g = clone(active)
        const l = leadersOf(g)
        closeSheet(true)
        if (l.length === 1 && l[0] && g.rounds.length) finish(g, l[0])
      },

      discardGame() {
        closeSheet(true)
        fx.play('del')
        setData((d) => ({ ...d, active: null }))
        go('home')
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
          const watching = cur.screen === 'game' && !cur.victory
          if (watching) {
            set({ finished: done })
            fx.later(500, () => {
              set({ victory: done })
              fx.play('win')
            })
          } else {
            fx.play('pick')
            showToast(COPY.toast.wonElsewhere(nameOf(done.winnerId), done.name))
          }
          return
        }
        if (!now && cur.screen === 'game' && !cur.finished) {
          go('home')
          // A refused write rolls the game back the same way; its rejection can land just
          // before or after this snapshot, so wait a moment before blaming another phone.
          fx.later(400, () => {
            if (!refused.has(was.id)) showToast(COPY.toast.endedElsewhere(was.name))
          })
        }
      },

      dispose() {
        fx.dispose()
        unsubRemote?.()
        unsubSave?.()
      },
    }

    return {
      data: initial,
      clock,
      screen: initial.active ? 'game' : 'home',
      sheet: null,
      sheetKey: 0,
      toast: null,
      banner: null,
      flash: null,
      victory: null,
      finished: null,
      foxWink: 0,
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

import {
  type Clock,
  computeStickers,
  isCompleted,
  ranked,
  STICKERS,
  systemClock,
  totalsOf,
} from '@tally/core'
import {
  BottomNav,
  FxCanvas,
  Haptics,
  type IconName,
  type PackItem,
  Ribbon,
  SFX,
  Sheet,
  SongStrip,
  StickerPack,
  SwipeView,
  ThemeRoot,
  Toast,
  VictoryOverlay,
} from '@tally/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TallyContext, useActions, useRoster, useTally, useTallyStore } from './context'
import { COPY } from './copy'
import { createEffects } from './effects'
import { useThemePref, useWakeLock } from './hooks'
import { readInstall } from './install'
import { useStaff } from './mixtape'
import { type DataProvider, localProvider } from './provider'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { GameDetailSheet } from './sheets/GameDetailSheet'
import { GameSheet } from './sheets/GameSheet'
import { InstallSheet } from './sheets/InstallSheet'
import { NewGameSheet } from './sheets/NewGameSheet'
import { SettingsSheet } from './sheets/SettingsSheet'
import { StickerBookSheet } from './sheets/StickerBookSheet'
import {
  createTallyStore,
  reactToRejection,
  type SheetSpec,
  type TallyStore,
  type UiState,
} from './store'
import type { CloudProvider } from './sync/cloudProvider'
import { demoSession, type SessionApi, SessionContext, useSessionController } from './sync/session'

export interface TallyAppProps {
  /**
   * Where data lives. Given: a static demo-like session over it (stories, tests). Default: the
   * session controller (this phone's localStorage, or the family's Firestore when signed in).
   */
  provider?: DataProvider
  clock?: Clock
  /** Starting UI state (stories: an open sheet, the victory overlay…). */
  initialUi?: Partial<UiState>
  /**
   * Rendered inside something else (Storybook): don't touch `<html>`, the theme-color meta,
   * the window scroll or the wake lock, and don't pin the wallpaper.
   */
  embedded?: boolean
  /** No sounds, haptics or confetti. */
  silent?: boolean
  /** Use this store instead of creating one (tests). */
  store?: TallyStore
  /** Inject a session (stories: a signed-in family, a fake SessionApi). */
  session?: SessionApi
}

/** The whole app: theme, screens, nav, sheets, toasts, ribbon, victory and confetti. */
export function TallyApp(props: TallyAppProps) {
  return props.session || props.provider || props.store ? (
    <StaticRoot {...props} />
  ) : (
    <ControlledRoot {...props} />
  )
}

/** The real thing: demo or family, from the session controller. */
function ControlledRoot(props: TallyAppProps) {
  return <Root {...props} api={useSessionController()} />
}

/** A fixed session: the one given, or a demo over the given provider. */
function StaticRoot(props: TallyAppProps) {
  const [demo] = useState(() => demoSession({ provider: props.provider ?? localProvider }))
  const given = props.session
  const api = given ? (props.provider ? { ...given, provider: props.provider } : given) : demo
  return <Root {...props} api={api} />
}

const providerIds = new WeakMap<DataProvider, number>()
let providerSeq = 0
const providerId = (p: DataProvider) => {
  let id = providerIds.get(p)
  if (id == null) {
    id = ++providerSeq
    providerIds.set(p, id)
  }
  return id
}

/** The tabs in order, left to right: swiping left goes to the next one. */
const TABS = ['home', 'history'] as const
const TAB_ORDER: Record<(typeof TABS)[number], number> = { home: 0, history: 1 }

/** Told to the web shell once the app has mounted: its launch screen can fade (decision 28). */
export const READY_EVENT = 'tally:ready'

/** Keyed on the session so a sign-in or sign-out swaps in a fresh store over its provider. */
function Root({ api, ...props }: TallyAppProps & { api: SessionApi }) {
  const key = `${api.session.mode}:${api.session.mode === 'family' ? api.session.member.email : ''}:${providerId(api.provider)}`
  return (
    <SessionContext.Provider value={api}>
      <SessionApp key={key} {...props} provider={api.provider} />
    </SessionContext.Provider>
  )
}

function SessionApp({
  provider,
  clock = systemClock,
  initialUi,
  embedded = false,
  silent = false,
  store: given,
}: TallyAppProps & { provider: DataProvider }) {
  const [store] = useState(
    () =>
      given ??
      createTallyStore(provider, clock, {
        ui: initialUi,
        effects: createEffects({ silent, scroll: !embedded }),
      }),
  )
  // A write the family record refused (a round after the game was won elsewhere).
  useEffect(() => {
    const cloud = provider as Partial<CloudProvider>
    return cloud.onRejected?.((r) => reactToRejection(store.getState().actions, r))
  }, [provider, store])
  return (
    <TallyContext.Provider value={store}>
      <Shell embedded={embedded} silent={silent} />
    </TallyContext.Provider>
  )
}

function Shell({ embedded, silent }: { embedded: boolean; silent: boolean }) {
  const prefs = useTally((s) => s.data.prefs)
  const screen = useTally((s) => s.screen)
  const active = useTally((s) => s.data.active)
  const finished = useTally((s) => s.finished)
  const toast = useTally((s) => s.toast)
  const banner = useTally((s) => s.banner)
  const foxWink = useTally((s) => s.foxWink)
  const a = useActions()
  const theme = useThemePref(prefs.theme, !embedded)

  const sheet = useTally((s) => s.sheet)
  // The game is a sheet over Home: the wake lock and the toast's place follow it.
  const inGame = sheet?.type === 'game' && !!(active ?? finished)

  useWakeLock(!embedded && inGame && prefs.wakeLock)
  useInstallHint(!embedded)

  // The app is up: the web shell's launch screen may go (after its first second; decision 28).
  useEffect(() => {
    if (!embedded) window.dispatchEvent(new Event(READY_EVENT))
  }, [embedded])
  useEffect(() => {
    if (!silent) SFX.setMuted(prefs.muted)
  }, [prefs.muted, silent])
  useEffect(() => {
    Haptics.setEnabled(!silent && prefs.haptics)
  }, [prefs.haptics, silent])
  useEffect(() => {
    if (silent) return
    // iOS only starts audio inside these gestures (not pointerdown), so unlock on every one:
    // it's a no-op while audio is running.
    const u = () => SFX.unlock()
    const events = ['touchend', 'click', 'keydown'] as const
    for (const e of events) window.addEventListener(e, u, { capture: true, passive: true })
    // Leaving the app: release the audio (and stop any Fox Trot song, so its playhead doesn't
    // run on unheard); the first tap back builds a fresh, working context.
    const sleep = () => {
      a.stopSong()
      SFX.sleep()
    }
    const away = () => {
      if (document.visibilityState === 'hidden') sleep()
    }
    document.addEventListener('visibilitychange', away)
    window.addEventListener('pagehide', sleep)
    return () => {
      for (const e of events) window.removeEventListener(e, u, { capture: true })
      document.removeEventListener('visibilitychange', away)
      window.removeEventListener('pagehide', sleep)
    }
  }, [silent, a])

  // Which way the tab arrived (by tab order), fixed for its mount so the slide-in runs once:
  // a swipe or a tap on the tab bar both slide it in from the side it lives on.
  const last = useRef(screen)
  const enter = useRef<'from-next' | 'from-prev' | null>(null)
  if (last.current !== screen) {
    enter.current = TAB_ORDER[screen] > TAB_ORDER[last.current] ? 'from-next' : 'from-prev'
    last.current = screen
  }

  return (
    <ThemeRoot theme={theme} fixed={!embedded} className="min-h-dvh">
      <SwipeView
        key={screen}
        enter={enter.current}
        hasPrev={TAB_ORDER[screen] > 0}
        hasNext={TAB_ORDER[screen] < TABS.length - 1}
        onSwipe={(to) => a.go(TABS[TAB_ORDER[screen] + (to === 'next' ? 1 : -1)] ?? screen, 'tap')}
      >
        {screen === 'history' ? <HistoryScreen /> : <HomeScreen />}
      </SwipeView>

      <BottomNav
        screen={screen}
        live={!!active}
        foxKey={foxWink}
        onHome={() => a.go('home', 'tap')}
        onHistory={() => a.go('history', 'tap')}
        onFab={a.fab}
      />

      <SheetHost />

      {banner && <Ribbon key={banner.k} text={banner.text} tone={banner.tone} />}
      {toast && <Toast key={toast.k} message={toast.msg} placement={inGame ? 'bottom' : 'nav'} />}
      <Victory />
      {!silent && <FxCanvas />}
    </ThemeRoot>
  )
}

/** How long after the app paints the install guide pops up, the first time. */
const INSTALL_HINT_MS = 1200

/**
 * The install guide, once: on first launch in a browser tab (not from the Home Screen, not in
 * Storybook), a moment after the app paints, if nothing else is up. Silent, because it isn't a
 * tap (and a sound outside a tap would take iOS's audio from other apps). However it's
 * dismissed, it never pops up by itself again (`prefs.installHintSeen`, this phone only).
 */
function useInstallHint(enabled: boolean) {
  const store = useTallyStore()
  useEffect(() => {
    if (!enabled) return
    const t = setTimeout(() => {
      const s = store.getState()
      // Busy (a sheet, a victory, a game on screen)? Not now: next launch.
      if (s.data.prefs.installHintSeen || s.sheet || s.victory || s.screen !== 'home') return
      if (readInstall().installed) return
      s.actions.openSheet({ type: 'install' }, true)
    }, INSTALL_HINT_MS)
    return () => clearTimeout(t)
  }, [enabled, store])

  const showing = useTally((s) => s.sheet?.type === 'install')
  const was = useRef(showing)
  useEffect(() => {
    if (was.current && !showing && !store.getState().data.prefs.installHintSeen)
      store.getState().actions.setPref('installHintSeen', true)
    was.current = showing
  }, [showing, store])
}

function labelOf(spec: SheetSpec | null, gameName: (id: string) => string, live: string): string {
  if (!spec) return ''
  switch (spec.type) {
    case 'new':
      return COPY.sheetLabel.new
    case 'game':
      return COPY.sheetLabel.game(live)
    case 'detail':
      return COPY.sheetLabel.detail(gameName(spec.id))
    case 'settings':
      return COPY.sheetLabel.settings
    case 'install':
      return COPY.sheetLabel.install
    case 'stickers':
      return COPY.sheetLabel.stickers
  }
}

/** One Sheet; its content stays rendered while it plays the closing animation. */
function SheetHost() {
  const sheet = useTally((s) => s.sheet)
  const sheetKey = useTally((s) => s.sheetKey)
  const games = useTally((s) => s.data.games)
  const active = useTally((s) => s.data.active)
  const finished = useTally((s) => s.finished)
  const live = active ?? finished
  const a = useActions()
  const last = useRef<SheetSpec | null>(sheet)
  if (sheet) last.current = sheet
  const spec = sheet ?? last.current

  const detail =
    spec?.type === 'detail' ? games.find((g) => g.id === spec.id && isCompleted(g)) : undefined

  let content: React.ReactNode = null
  if (spec?.type === 'new') content = <NewGameSheet />
  else if (spec?.type === 'game' && live) content = <GameSheet game={live} page={spec.page} />
  else if (detail && isCompleted(detail)) content = <GameDetailSheet game={detail} />
  else if (spec?.type === 'settings') content = <SettingsSheet />
  else if (spec?.type === 'install') content = <InstallSheet />
  else if (spec?.type === 'stickers') content = <StickerBookSheet playerId={spec.playerId} />

  return (
    <Sheet
      open={!!sheet}
      onClose={() => a.closeSheet()}
      // Settings, the game and game detail are stacks of pages (SheetNav): full height, named by the page on top.
      nav={spec?.type === 'settings' || spec?.type === 'game' || spec?.type === 'detail'}
      label={labelOf(spec, (id) => games.find((g) => g.id === id)?.name ?? '', live?.name ?? '')}
    >
      <div key={sheetKey} style={{ display: 'contents' }}>
        {content}
      </div>
    </Sheet>
  )
}

function Victory() {
  const victory = useTally((s) => s.victory)
  const games = useTally((s) => s.data.games)
  const pack = useTally((s) => s.pack)
  const song = useTally((s) => s.song)
  const a = useActions()
  const roster = useRoster()
  const staff = useStaff(victory)
  // The pack: the winner's own crowned chip, then the stickers this game gave out (firsts first).
  const items = useMemo((): PackItem[] => {
    if (!victory?.winnerId) return []
    const S = COPY.stickers
    const earned = [...(computeStickers(games.filter(isCompleted)).byGame[victory.id] ?? [])]
      .sort((x, y) => Number(y.isNew) - Number(x.isNew))
      .slice(0, 5)
    return [
      {
        key: 'winner',
        name: victory.name,
        who: roster.nameOf(victory.winnerId),
        color: roster.colorOf(victory.winnerId),
      },
      ...earned.flatMap((e, i) => {
        const k = STICKERS.find((s) => s.id === e.id)
        if (!k) return []
        const label = S.names[e.id]
        return [
          {
            key: `${e.playerId}-${e.id}-${i}`,
            name: label,
            who: roster.nameOf(e.playerId),
            isNew: e.isNew,
            sticker: {
              label: S.earnedBy(label, roster.nameOf(e.playerId)),
              tone: k.tone,
              icon: k.icon as IconName,
              shape: k.shape,
            },
          },
        ]
      }),
    ]
  }, [victory, games, roster])
  if (!victory?.winnerId) return null
  const t = totalsOf(victory)
  // The winner tops the podium even when crowned from a tie (level with someone ranked first).
  const order = [victory.winnerId, ...ranked(victory).filter((id) => id !== victory.winnerId)]
  // "Who won?" games quote wins, not points: "wins Uno", "wins Jaipur, 2–1".
  const won = t[victory.winnerId] ?? 0
  const next = t[order.find((id) => id !== victory.winnerId) ?? ''] ?? 0
  const sub =
    victory.goal !== 'wins'
      ? undefined
      : (victory.target ?? 1) <= 1
        ? COPY.victory.winsSingle(victory.name)
        : COPY.victory.winsMatch(victory.name, won, next)
  const S = COPY.stickers
  const stickers = items.length - 1
  return (
    <VictoryOverlay
      winner={roster.nameOf(victory.winnerId)}
      gameName={victory.name}
      total={won}
      sub={sub}
      rows={order.map((id) => ({
        id,
        name: roster.nameOf(id),
        color: roster.colorOf(id),
        total: t[id] ?? 0,
      }))}
      onDone={a.victoryDone}
      onRematch={() => a.rematch(victory)}
    >
      <SongStrip
        bare
        song={staff}
        playing={song?.gameId === victory.id && song.whole}
        onPlay={() => a.playSong(victory.id, 'victory')}
        label={song?.gameId === victory.id ? COPY.foxTrot.stop(victory.name) : COPY.foxTrot.replay}
      />
      {pack && (
        <StickerPack
          items={items}
          open={pack.open}
          shown={pack.shown}
          onOpen={() =>
            a.openPack(
              items.length,
              window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
            )
          }
          title={S.packTitle}
          sub={S.packSub(Math.max(1, stickers + 1))}
          hint={S.packHint}
          openLabel={S.pack}
          winnerLabel={S.winner}
          newLabel={S.isNew}
        />
      )}
    </VictoryOverlay>
  )
}

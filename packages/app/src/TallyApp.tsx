import { type Clock, isCompleted, ranked, systemClock, totalsOf } from '@tally/core'
import {
  BottomNav,
  FxCanvas,
  Haptics,
  Ribbon,
  SFX,
  Sheet,
  ThemeRoot,
  Toast,
  VictoryOverlay,
} from '@tally/ui'
import { useEffect, useRef, useState } from 'react'
import { TallyContext, useActions, useRoster, useTally, useTallyStore } from './context'
import { COPY } from './copy'
import { createEffects } from './effects'
import { useThemePref, useWakeLock } from './hooks'
import { readInstall } from './install'
import { type DataProvider, localProvider } from './provider'
import { GameScreen } from './screens/GameScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { EditRoundSheet } from './sheets/EditRoundSheet'
import { EndGameSheet } from './sheets/EndGameSheet'
import { GameDetailSheet } from './sheets/GameDetailSheet'
import { InstallSheet } from './sheets/InstallSheet'
import { NewGameSheet } from './sheets/NewGameSheet'
import { SettingsSheet } from './sheets/SettingsSheet'
import { SignInSheet } from './sheets/SignInSheet'
import { createTallyStore, type SheetSpec, type TallyStore, type UiState } from './store'
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
    return cloud.onRejected?.(() => store.getState().actions.showToast(COPY.toast.syncRejected))
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

  const shown = active ?? finished
  const inGame = screen === 'game' && !!shown

  useWakeLock(!embedded && inGame && prefs.wakeLock)
  useInstallHint(!embedded)

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
    // Leaving the app: release the audio; the first tap back builds a fresh, working context.
    const away = () => {
      if (document.visibilityState === 'hidden') SFX.sleep()
    }
    document.addEventListener('visibilitychange', away)
    window.addEventListener('pagehide', SFX.sleep)
    return () => {
      for (const e of events) window.removeEventListener(e, u, { capture: true })
      document.removeEventListener('visibilitychange', away)
      window.removeEventListener('pagehide', SFX.sleep)
    }
  }, [silent])

  return (
    <ThemeRoot theme={theme} fixed={!embedded} className="min-h-dvh">
      {inGame && shown ? (
        <GameScreen game={shown} />
      ) : screen === 'history' ? (
        <HistoryScreen />
      ) : (
        <HomeScreen />
      )}

      {!inGame && (
        <BottomNav
          screen={screen === 'history' ? 'history' : 'home'}
          live={!!active}
          foxKey={foxWink}
          onHome={() => a.go('home', 'tap')}
          onHistory={() => a.go('history', 'tap')}
          onFab={a.fab}
        />
      )}

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

function labelOf(spec: SheetSpec | null, gameName: (id: string) => string): string {
  if (!spec) return ''
  switch (spec.type) {
    case 'new':
      return COPY.sheetLabel.new
    case 'round':
      return COPY.sheetLabel.round(spec.idx + 1)
    case 'end':
      return COPY.sheetLabel.end
    case 'detail':
      return COPY.sheetLabel.detail(gameName(spec.id))
    case 'settings':
      return COPY.sheetLabel.settings
    case 'signin':
      return COPY.sheetLabel.signin
    case 'install':
      return COPY.sheetLabel.install
  }
}

/** One Sheet; its content stays rendered while it plays the closing animation. */
function SheetHost() {
  const sheet = useTally((s) => s.sheet)
  const sheetKey = useTally((s) => s.sheetKey)
  const games = useTally((s) => s.data.games)
  const active = useTally((s) => s.data.active)
  const a = useActions()
  const last = useRef<SheetSpec | null>(sheet)
  if (sheet) last.current = sheet
  const spec = sheet ?? last.current

  const detail =
    spec?.type === 'detail' ? games.find((g) => g.id === spec.id && isCompleted(g)) : undefined

  let content: React.ReactNode = null
  if (spec?.type === 'new') content = <NewGameSheet />
  else if (spec?.type === 'round' && active?.rounds[spec.idx])
    content = <EditRoundSheet game={active} idx={spec.idx} />
  else if (spec?.type === 'end' && active) content = <EndGameSheet game={active} />
  else if (detail && isCompleted(detail)) content = <GameDetailSheet game={detail} />
  else if (spec?.type === 'settings') content = <SettingsSheet />
  else if (spec?.type === 'signin') content = <SignInSheet />
  else if (spec?.type === 'install') content = <InstallSheet />

  return (
    <Sheet
      open={!!sheet}
      onClose={() => a.closeSheet()}
      label={labelOf(spec, (id) => games.find((g) => g.id === id)?.name ?? '')}
    >
      <div key={sheetKey} style={{ display: 'contents' }}>
        {content}
      </div>
    </Sheet>
  )
}

function Victory() {
  const victory = useTally((s) => s.victory)
  const a = useActions()
  const roster = useRoster()
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
    />
  )
}

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
import { TallyContext, useActions, useRoster, useTally } from './context'
import { COPY } from './copy'
import { createEffects } from './effects'
import { useThemePref, useWakeLock } from './hooks'
import { type DataProvider, localProvider } from './provider'
import { GameScreen } from './screens/GameScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { EditRoundSheet } from './sheets/EditRoundSheet'
import { EndGameSheet } from './sheets/EndGameSheet'
import { GameDetailSheet } from './sheets/GameDetailSheet'
import { NewGameSheet } from './sheets/NewGameSheet'
import { SettingsSheet } from './sheets/SettingsSheet'
import { createTallyStore, type SheetSpec, type TallyStore, type UiState } from './store'

export interface TallyAppProps {
  /** Where data lives. Default: this phone's localStorage. */
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
}

/** The whole app: theme, screens, nav, sheets, toasts, ribbon, victory and confetti. */
export function TallyApp({
  provider = localProvider,
  clock = systemClock,
  initialUi,
  embedded = false,
  silent = false,
  store: given,
}: TallyAppProps) {
  const [store] = useState(
    () =>
      given ??
      createTallyStore(provider, clock, {
        ui: initialUi,
        effects: createEffects({ silent, scroll: !embedded }),
      }),
  )
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

  useEffect(() => {
    if (!silent) SFX.setMuted(prefs.muted)
  }, [prefs.muted, silent])
  useEffect(() => {
    Haptics.setEnabled(!silent && prefs.haptics)
  }, [prefs.haptics, silent])
  useEffect(() => {
    if (!silent) SFX.setPlayInSilent(prefs.soundInSilent)
  }, [prefs.soundInSilent, silent])
  useEffect(() => {
    if (silent) return
    // iOS only starts audio inside these gestures (not pointerdown), and a backgrounded PWA
    // returns with its audio interrupted, so unlock on every one: it's a no-op once running.
    const u = () => SFX.unlock()
    const events = ['touchend', 'click', 'keydown'] as const
    for (const e of events) window.addEventListener(e, u, { capture: true, passive: true })
    return () => {
      for (const e of events) window.removeEventListener(e, u, { capture: true })
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
  return (
    <VictoryOverlay
      winner={roster.nameOf(victory.winnerId)}
      gameName={victory.name}
      total={t[victory.winnerId] ?? 0}
      rows={ranked(victory).map((id) => ({
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

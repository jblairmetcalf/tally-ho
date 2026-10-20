import type { Meta, StoryObj } from '@storybook/react'
import type { Store, ThemePref } from '@tally/core'
import { Sheet, SheetNav } from '@tally/ui'
import { useState } from 'react'
import { TallyContext } from './context'
import { COPY } from './copy'
import { createEffects } from './effects'
import { fixedClock, SCENARIOS, withTheme } from './fixtures'
import { memoryProvider } from './provider'
import { SignInContent, type SignInPreviewProps } from './sheets/SignInSheet'
import { createTallyStore, type UiState } from './store'
import {
  demoSession,
  type SessionApi,
  SessionContext,
  SignInError,
  type SyncState,
} from './sync/session'
import { TallyApp } from './TallyApp'

/*
 * Family sync, every state the UI shows, with a fake `SessionApi` (`demoSession`): the
 * signed-out demo with sign-in enabled, a signed-in member in each sync state, the sign-in
 * sheet's errors, the live-game warning in New game and who-scored-it in the round log.
 */

const KATE = { email: 'kate@example.com', name: 'Kate', playerId: 'kate' }

const demo = () =>
  demoSession({
    enabled: true,
    signIn: async () => {
      throw new SignInError('wrong-credentials')
    },
  })

const family = (state: SyncState = 'synced') =>
  demoSession({
    enabled: true,
    session: { mode: 'family', member: KATE },
    sync: { state, lastSyncedAt: fixedClock.now() },
  })

/** A live Flip 7 that Blair dealt in; Kate and Blair have been scoring from their own phones. */
const familyGame = (): Store => {
  const s = SCENARIOS.flip7Race()
  const by = ['kate', 'blair', 'kate', 'blair']
  return {
    ...s,
    active: s.active && {
      ...s.active,
      startedBy: 'blair',
      rounds: s.active.rounds.map((r, i) => ({ ...r, by: by[i] })),
    },
  }
}

const THEMES: { id: Exclude<ThemePref, 'system'>; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Daylight' },
]

interface FamilyFramesProps {
  store: () => Store
  session: () => SessionApi
  ui?: Partial<UiState>
}

/** The app twice (dark, Daylight), each phone-sized, over a fake session. */
function FamilyFrames({ store, session, ui }: FamilyFramesProps) {
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 24, alignItems: 'flex-start' }}
    >
      {THEMES.map((t) => (
        <figure key={t.id} style={{ margin: 0 }}>
          <figcaption className="sb-label">{t.label}</figcaption>
          <Frame theme={t.id} store={store} session={session} ui={ui} />
        </figure>
      ))}
    </div>
  )
}

function Frame({ theme, store, session, ui }: FamilyFramesProps & { theme: ThemePref }) {
  const [provider] = useState(() => memoryProvider(withTheme(store(), theme)))
  const [api] = useState(session)
  return (
    <div
      style={{
        width: 390,
        height: 844,
        overflow: 'auto',
        transform: 'translateZ(0)',
        borderRadius: 28,
        boxShadow: '0 0 0 1px rgb(127 127 127 / 0.3)',
      }}
    >
      <TallyApp provider={provider} session={api} initialUi={ui} embedded silent />
    </div>
  )
}

const meta: Meta<typeof FamilyFrames> = {
  title: 'Screens/Family sync',
  tags: ['!autodocs'],
  component: FamilyFrames,
  parameters: { tally: { bare: true }, layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof FamilyFrames>

const settings: Partial<UiState> = { sheet: { type: 'settings' }, sheetKey: 1 }

/** Signed out, sign-in available: the small dashed "Demo" chip in the header opens Settings. */
export const HomeDemo: Story = { args: { store: SCENARIOS.firstRun, session: demo } }

/** Signed in and up to date: a jade cloud. */
export const HomeSynced: Story = {
  args: { store: familyGame, session: () => family('synced'), ui: { screen: 'home' } },
}

/** Scored on this phone, still on its way up: the amber dot. */
export const HomePending: Story = {
  args: { store: familyGame, session: () => family('pending'), ui: { screen: 'home' } },
}

/** No signal: the crossed-out cloud. Scores still save on this phone. Tapping says so. */
export const HomeOffline: Story = {
  args: {
    store: familyGame,
    session: () => family('offline'),
    ui: { screen: 'home', toast: { msg: 'Offline · saved on this phone', k: 1 } },
  },
}

export const HomeSyncError: Story = {
  args: { store: familyGame, session: () => family('error'), ui: { screen: 'home' } },
}

/** Just signed in: Home says welcome. */
export const Welcome: Story = {
  args: {
    store: familyGame,
    session: () => family('synced'),
    ui: { screen: 'home', toast: { msg: COPY.signIn.welcome('Kate'), k: 1 } },
  },
}

/** Settings › Family, signed out: "Family sign in" and "Reset demo". */
export const SettingsSignedOut: Story = {
  args: { store: SCENARIOS.firstRun, session: demo, ui: settings },
}

/** Settings › Family, signed in: who, the sync badge, export, and the two-tap sign out. */
export const SettingsSignedIn: Story = {
  args: { store: familyGame, session: () => family('synced'), ui: settings },
}

/** Settings in a demo-only build (no Firebase config): no Family section at all. */
export const SettingsDemoOnlyBuild: Story = {
  args: { store: SCENARIOS.firstRun, session: () => demoSession(), ui: settings },
}

/** New game while a game is on: "Flip 7 is in progress · started by Blair" and Resume. */
export const NewGameWhileLive: Story = {
  args: {
    store: familyGame,
    session: () => family('synced'),
    ui: { sheet: { type: 'new' }, sheetKey: 1 },
  },
}

/** The game screen's round log: a tiny initial for whoever scored each round. */
export const GameScoredBy: Story = {
  args: {
    store: familyGame,
    session: () => family('synced'),
    ui: { sheet: { type: 'game' }, sheetKey: 1 },
  },
}

/* ---------- the sign-in page mid-flow (one theme, toolbar switches) ---------- */

/** Family sign in as the app shows it: a page in Settings' sheet (here alone, so no back). */
function SignInAt(props: SignInPreviewProps) {
  const [store] = useState(() =>
    createTallyStore(memoryProvider(SCENARIOS.firstRun()), fixedClock, {
      effects: createEffects({ silent: true, scroll: false }),
    }),
  )
  const [api] = useState(demo)
  return (
    <SessionContext.Provider value={api}>
      <TallyContext.Provider value={store}>
        <Sheet open nav label={COPY.signIn.title} onClose={() => {}}>
          <SheetNav
            pages={[
              {
                key: 'signin',
                title: COPY.signIn.title,
                content: <SignInContent {...props} onDone={() => {}} />,
              },
            ]}
            onBack={() => {}}
            onClose={() => {}}
            backLabel={COPY.sheetBack}
            closeLabel={COPY.close}
          />
        </Sheet>
      </TallyContext.Provider>
    </SessionContext.Provider>
  )
}

const filled = { email: 'kate@example.com', password: 'hunter22' }

export const SignInBusy: StoryObj<typeof SignInAt> = {
  render: () => <SignInAt preview={{ ...filled, busy: true }} />,
  parameters: { tally: { overlay: true, bare: false } },
}
export const SignInWrongPassword: StoryObj<typeof SignInAt> = {
  render: () => <SignInAt preview={{ ...filled, error: 'wrong-credentials' }} />,
  parameters: { tally: { overlay: true, bare: false } },
}
export const SignInNotFamily: StoryObj<typeof SignInAt> = {
  render: () => <SignInAt preview={{ ...filled, error: 'not-family' }} />,
  parameters: { tally: { overlay: true, bare: false } },
}
export const SignInOffline: StoryObj<typeof SignInAt> = {
  render: () => <SignInAt preview={{ ...filled, error: 'offline' }} />,
  parameters: { tally: { overlay: true, bare: false } },
}
/** Online (the password check got through), but the family record didn't answer in time. */
export const SignInUnreachable: StoryObj<typeof SignInAt> = {
  render: () => <SignInAt preview={{ ...filled, error: 'unreachable' }} />,
  parameters: { tally: { overlay: true, bare: false } },
}
export const SignInTooManyTries: StoryObj<typeof SignInAt> = {
  render: () => <SignInAt preview={{ ...filled, error: 'too-many-attempts' }} />,
  parameters: { tally: { overlay: true, bare: false } },
}

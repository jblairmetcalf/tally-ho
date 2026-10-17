import {
  type Clock,
  DEFAULT_PLAYERS,
  DEFAULT_PRESETS,
  freshStore,
  migrate,
  type Store,
  systemClock,
} from '@tally/core'
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { createLocalProvider, type DataProvider, memoryProvider, STORAGE_KEY } from '../provider'
import {
  type CloudProvider,
  createCloudProvider,
  emptyFamilyStore,
  type Member,
  type SyncState,
  type SyncStatus,
} from './cloudProvider'
import { type FirebaseConfig, firebaseConfig } from './config'
import { playerDoc, presetDoc } from './docs'
import { type FirebaseHandle, type FsError, loadFirebase } from './firebase'
import {
  browserStorage,
  MIRROR_KEY,
  OUTBOX_KEY,
  readJson,
  removeKey,
  SESSION_KEY,
  type StorageLike,
  writeJson,
} from './storage'

export type { Member, SyncState, SyncStatus }

export type Session = { mode: 'demo' } | { mode: 'family'; member: Member }

export type SignInErrorCode =
  | 'wrong-credentials'
  | 'not-family'
  | 'offline'
  | 'too-many-attempts'
  | 'unknown'

export class SignInError extends Error {
  readonly code: SignInErrorCode
  constructor(code: SignInErrorCode, message: string = code) {
    super(message)
    this.name = 'SignInError'
    this.code = code
  }
}

export interface SessionApi {
  /** Firebase is configured in this build (else demo-only: hide sign-in). */
  enabled: boolean
  session: Session
  /** Stable per session; TallyApp keys its store on it. */
  provider: DataProvider
  /** Family mode only. */
  sync: SyncStatus | null
  /** Rejects with a `SignInError`. */
  signIn(email: string, password: string): Promise<void>
  /** Terminate Firestore, clear its IndexedDB and the mirror; the demo starts fresh. */
  signOut(): Promise<void>
  /** Demo store back to fresh samples. */
  resetDemo(): void
  sendPasswordReset(email: string): Promise<void>
}

/** Firebase Auth error codes → what the sign-in sheet says. */
export function signInErrorOf(e: unknown): SignInError {
  if (e instanceof SignInError) return e
  const code = (e as FsError | undefined)?.code ?? ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
    case 'auth/missing-password':
      return new SignInError('wrong-credentials')
    case 'auth/network-request-failed':
    case 'unavailable':
      return new SignInError('offline')
    case 'auth/too-many-requests':
      return new SignInError('too-many-attempts')
    default:
      return new SignInError('unknown', (e as Error | undefined)?.message ?? 'unknown')
  }
}

const isMember = (v: unknown): v is Member =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as Member).email === 'string' &&
  typeof (v as Member).name === 'string' &&
  typeof (v as Member).playerId === 'string'

export interface SessionCoreOptions {
  /** Null: demo-only build. */
  config: FirebaseConfig | null
  /** Default: `loadFirebase(config)` (a dynamic import). Tests pass fakes. */
  connect?: () => Promise<FirebaseHandle>
  /** Default: localStorage. */
  storage?: StorageLike | null
  clock?: Clock
  /** Default: `navigator.onLine`. */
  online?: () => boolean
  /** The demo's provider. Default: localStorage under `tallyho.v3`. */
  demoProvider?: () => DataProvider
}

export interface SessionCore {
  getSnapshot(): SessionApi
  subscribe(listener: () => void): () => void
  /** Check a restored family session against Auth and `members` (once mounted). */
  start(): () => void
}

/**
 * The session as a plain object: demo or family, the provider for each, and the
 * sign-in/out flows. `useSessionController` wraps it for React; tests drive it directly.
 */
export function createSessionCore(opts: SessionCoreOptions): SessionCore {
  const storage = opts.storage === undefined ? browserStorage() : opts.storage
  const clock = opts.clock ?? systemClock
  const config = opts.config
  const enabled = !!config
  const makeDemo = opts.demoProvider ?? (() => createLocalProvider())

  let handle: Promise<FirebaseHandle> | null = null
  const connect = (): Promise<FirebaseHandle> => {
    if (!config) return Promise.reject(new SignInError('unknown', 'Firebase is not configured'))
    handle ??= (opts.connect ?? (() => loadFirebase(config)))().catch((e: unknown) => {
      handle = null
      throw e
    })
    return handle
  }

  /** Prefs carry over from the demo when this phone has no family mirror yet. */
  const fallback = (): Store => {
    const demo = migrate(readJson(storage, STORAGE_KEY))
    const base = emptyFamilyStore()
    return demo ? { ...base, prefs: demo.prefs } : base
  }

  let session: Session = { mode: 'demo' }
  let provider: DataProvider
  let cloud: CloudProvider | null = null
  let sync: SyncStatus | null = null
  let unwatch: (() => void) | null = null
  const listeners = new Set<() => void>()
  let ready = false

  const enterFamily = (member: Member) => {
    cloud = createCloudProvider({
      member,
      db: () => connect().then((h) => h.db),
      storage,
      clock,
      online: opts.online,
      fallback,
    })
    session = { mode: 'family', member }
    provider = cloud
    unwatch = cloud.watchStatus((s) => {
      sync = s
      if (ready) changed()
    })
  }

  const enterDemo = () => {
    unwatch?.()
    unwatch = null
    cloud?.dispose()
    cloud = null
    sync = null
    session = { mode: 'demo' }
    provider = makeDemo()
  }

  const flag = enabled ? readJson(storage, SESSION_KEY) : null
  if (isMember(flag)) enterFamily(flag)
  else provider = makeDemo()

  const resetDemoData = () => {
    const fresh = freshStore(clock)
    writeJson(storage, STORAGE_KEY, fresh)
    // A debounced save from the old demo store must not land on top of the reset.
    if (session.mode === 'demo') provider.save(fresh)
  }

  const signOut = async () => {
    const wasDemo = session.mode === 'demo'
    unwatch?.()
    unwatch = null
    cloud?.dispose()
    removeKey(storage, SESSION_KEY)
    if (enabled && !wasDemo) {
      try {
        const h = await connect()
        await h.auth.signOut().catch(() => {})
        await h.db.terminate().catch(() => {})
      } catch {
        /* offline and never loaded: nothing on the device to clear but ours */
      }
    }
    removeKey(storage, MIRROR_KEY)
    removeKey(storage, OUTBOX_KEY)
    resetDemoData()
    enterDemo()
    changed()
  }

  /** Default players and presets, with their fixed ids, if the family has none yet. */
  const seed = async (h: FirebaseHandle) => {
    const now = new Date(clock.now()).toISOString()
    const [players, presets] = await Promise.all([
      h.db.listServer('players'),
      h.db.listServer('presets'),
    ])
    const writes: Promise<void>[] = []
    if (!players.length)
      for (const p of DEFAULT_PLAYERS)
        writes.push(h.db.set('players', p.id, { ...playerDoc(p), updatedAt: now }, true))
    if (!presets.length)
      for (const p of DEFAULT_PRESETS)
        writes.push(h.db.set('presets', p.id, { ...presetDoc(p), updatedAt: now }, true))
    await Promise.all(writes)
  }

  const signIn = async (email: string, password: string) => {
    const address = email.trim().toLowerCase()
    let h: FirebaseHandle
    try {
      h = await connect()
    } catch (e) {
      throw e instanceof SignInError ? e : new SignInError('offline')
    }
    try {
      await h.auth.signIn(address, password)
    } catch (e) {
      throw signInErrorOf(e)
    }
    let doc: { data: Record<string, unknown> } | null
    try {
      doc = await h.db.getServer('members', address)
    } catch (e) {
      if ((e as FsError).code !== 'permission-denied') {
        await h.auth.signOut().catch(() => {})
        throw signInErrorOf(e)
      }
      doc = null
    }
    if (!doc) {
      await h.auth.signOut().catch(() => {})
      throw new SignInError('not-family')
    }
    const member: Member = {
      email: address,
      name: typeof doc.data.name === 'string' && doc.data.name ? doc.data.name : address,
      playerId: typeof doc.data.playerId === 'string' ? doc.data.playerId : '',
    }
    await seed(h).catch(() => {}) // idempotent: the next sign-in tries again
    writeJson(storage, SESSION_KEY, member)
    unwatch?.()
    cloud?.dispose()
    enterFamily(member)
    changed()
  }

  const sendPasswordReset = async (email: string) => {
    let h: FirebaseHandle
    try {
      h = await connect()
    } catch {
      throw new SignInError('offline')
    }
    try {
      await h.auth.sendPasswordReset(email.trim().toLowerCase())
    } catch (e) {
      throw signInErrorOf(e)
    }
  }

  const resetDemo = () => {
    resetDemoData()
    if (session.mode === 'demo') {
      provider = makeDemo()
      changed()
    }
  }

  let snapshot: SessionApi
  const build = (): SessionApi => ({
    enabled,
    session,
    provider,
    sync: session.mode === 'family' ? sync : null,
    signIn,
    signOut,
    resetDemo,
    sendPasswordReset,
  })
  snapshot = build()
  ready = true
  function changed() {
    snapshot = build()
    for (const l of listeners) l()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    start() {
      let stopped = false
      if (session.mode === 'family') {
        const member = session.member
        void (async () => {
          let h: FirebaseHandle
          try {
            h = await connect()
          } catch {
            return // offline before the SDK was ever cached: stay on the mirror
          }
          const user = await h.auth.currentUser().catch(() => undefined)
          if (stopped || session.mode !== 'family') return
          if (user === null || (user && user.email?.toLowerCase() !== member.email)) {
            await signOut()
            return
          }
          try {
            const doc = await h.db.getServer('members', member.email)
            if (stopped || session.mode !== 'family') return
            if (!doc) await signOut()
          } catch (e) {
            // Removed from the family: out. Offline: stay, it checks again next launch.
            if (!stopped && (e as FsError).code === 'permission-denied') await signOut()
          }
        })()
      }
      return () => {
        stopped = true
      }
    },
  }
}

export const SessionContext = createContext<SessionApi | null>(null)

/** The session, inside `<TallyApp>`. */
export function useSession(): SessionApi {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useSession must be used inside <TallyApp>')
  return s
}

/** The real session: Firebase from the build's env. Used once, at the app root. */
export function useSessionController(): SessionApi {
  const [core] = useState(() => createSessionCore({ config: firebaseConfig() }))
  useEffect(() => core.start(), [core])
  return useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot)
}

/** A static demo session for stories and tests; override anything. */
export function demoSession(over: Partial<SessionApi> = {}): SessionApi {
  return {
    enabled: false,
    session: { mode: 'demo' },
    provider: over.provider ?? memoryProvider(),
    sync: null,
    signIn: async () => {
      throw new SignInError('unknown', 'Sign-in is not available here')
    },
    signOut: async () => {},
    resetDemo: () => {},
    sendPasswordReset: async () => {},
    ...over,
  }
}

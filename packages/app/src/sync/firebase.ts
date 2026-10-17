import {
  AUTH_EMULATOR_URL,
  emulatorEnabled,
  FIRESTORE_EMULATOR,
  type FirebaseConfig,
} from './config'
import type { DocData } from './docs'

// Nothing here imports `firebase/*` statically. The SDK is fetched with a dynamic import the
// first time family mode needs it, so demo visitors never download it.

export interface FsDoc {
  id: string
  data: DocData
}

export interface FsSnapshot {
  docs: FsDoc[]
  /** Some of these documents include writes the server hasn't confirmed yet. */
  hasPendingWrites: boolean
  /** Served from the on-device cache, not (yet) confirmed by the server. */
  fromCache: boolean
}

/** A Firestore or Auth failure: `code` is e.g. `permission-denied` or `auth/wrong-password`. */
export type FsError = Error & { code?: string }

/**
 * The few Firestore calls sync makes, by collection name and document id. `loadFirebase`
 * binds them to the real SDK; tests bind them to `FakeFirestore`.
 */
export interface FirestoreApi {
  /** Snapshots of a whole collection, including metadata-only changes. */
  listen(col: string, next: (s: FsSnapshot) => void, fail: (e: FsError) => void): () => void
  /** Create or replace (or merge into) a document. Resolves when the server has it. */
  set(col: string, id: string, data: DocData, merge?: boolean): Promise<void>
  /** Change fields (dotted keys reach into maps). Fails if the document doesn't exist. */
  update(col: string, id: string, data: DocData): Promise<void>
  remove(col: string, id: string): Promise<void>
  /** One document, from the server (rejects offline). Null when it doesn't exist. */
  getServer(col: string, id: string): Promise<FsDoc | null>
  /** A whole collection, from the server (rejects offline). */
  listServer(col: string): Promise<FsDoc[]>
  /** The sentinel that clears a field in `update`. */
  deleteField(): unknown
  /** Stop everything and wipe the on-device cache (sign-out). The next call starts fresh. */
  terminate(): Promise<void>
}

export interface AuthUser {
  email: string | null
}

export interface AuthApi {
  signIn(email: string, password: string): Promise<AuthUser>
  signOut(): Promise<void>
  /** The restored user once persistence has loaded, or null. */
  currentUser(): Promise<AuthUser | null>
  sendPasswordReset(email: string): Promise<void>
}

export interface FirebaseHandle {
  db: FirestoreApi
  auth: AuthApi
}

/** Installed to the home screen: one tab only, so the single-tab cache is the right one. */
function standalone(): boolean {
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

/** IndexedDB going away under us (iOS after a long background) or a dead persistence layer. */
function isCacheFailure(e: unknown): boolean {
  const err = e as FsError | undefined
  if (!err) return false
  return err.code === 'failed-precondition' || /indexeddb|indexed database/i.test(err.message ?? '')
}

let loading: Promise<FirebaseHandle> | undefined

/** Loads the Firebase SDK once and binds it to `FirestoreApi` + `AuthApi`. */
export function loadFirebase(config: FirebaseConfig): Promise<FirebaseHandle> {
  loading ??= bind(config).catch((e: unknown) => {
    loading = undefined // let the next call try again (the chunk may load once online)
    throw e
  })
  return loading
}

async function bind(config: FirebaseConfig): Promise<FirebaseHandle> {
  const [appMod, fs, au] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore'),
    import('firebase/auth'),
  ])
  const app = appMod.getApps()[0] ?? appMod.initializeApp(config)
  const emulator = emulatorEnabled()

  type Db = ReturnType<typeof fs.getFirestore>
  let db: Db | null = null
  let failed = false

  const open = (): Db => {
    if (db) return db
    try {
      db = fs.initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        localCache: fs.persistentLocalCache({
          tabManager: standalone()
            ? fs.persistentSingleTabManager({})
            : fs.persistentMultipleTabManager(),
        }),
      })
      if (emulator)
        fs.connectFirestoreEmulator(db, FIRESTORE_EMULATOR.host, FIRESTORE_EMULATOR.port)
    } catch {
      db = fs.getFirestore(app) // already initialised (hot reload)
    }
    return db
  }

  const note = (e: unknown) => {
    if (isCacheFailure(e)) failed = true
  }
  const guard = <T>(p: Promise<T>): Promise<T> =>
    p.catch((e: unknown) => {
      note(e)
      throw e
    })

  interface Listen {
    col: string
    next: (s: FsSnapshot) => void
    fail: (e: FsError) => void
    stop: () => void
  }
  const listens = new Set<Listen>()
  const attach = (l: Listen) => {
    l.stop = fs.onSnapshot(
      fs.collection(open(), l.col),
      { includeMetadataChanges: true },
      (snap) =>
        l.next({
          docs: snap.docs.map((d) => ({ id: d.id, data: d.data() })),
          hasPendingWrites: snap.metadata.hasPendingWrites,
          fromCache: snap.metadata.fromCache,
        }),
      (e) => {
        note(e)
        l.fail(e)
      },
    )
  }

  // Back from the background after the cache died: start a fresh Firestore and re-listen.
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !failed || !db) return
      failed = false
      const old = db
      for (const l of listens) l.stop()
      db = null
      void fs
        .terminate(old)
        .catch(() => {})
        .then(() => {
          for (const l of listens) attach(l)
        })
    })

  const ref = (col: string, id: string) => fs.doc(open(), col, id)

  const store: FirestoreApi = {
    listen(col, next, fail) {
      const l: Listen = { col, next, fail, stop: () => {} }
      attach(l)
      listens.add(l)
      return () => {
        listens.delete(l)
        l.stop()
      }
    },
    set: (col, id, data, merge) =>
      guard(fs.setDoc(ref(col, id), data, merge ? { merge: true } : {})),
    update: (col, id, data) => guard(fs.updateDoc(ref(col, id), data)),
    remove: (col, id) => guard(fs.deleteDoc(ref(col, id))),
    async getServer(col, id) {
      const d = await guard(fs.getDocFromServer(ref(col, id)))
      const data = d.data()
      return data ? { id: d.id, data } : null
    },
    async listServer(col) {
      const snap = await guard(fs.getDocsFromServer(fs.collection(open(), col)))
      return snap.docs.map((d) => ({ id: d.id, data: d.data() }))
    },
    deleteField: () => fs.deleteField(),
    async terminate() {
      for (const l of listens) l.stop()
      listens.clear()
      const old = db
      db = null
      failed = false
      if (!old) return
      await fs.terminate(old)
      await fs.clearIndexedDbPersistence(old)
    },
  }

  let auth: ReturnType<typeof au.getAuth>
  try {
    auth = au.initializeAuth(app, {
      persistence: [au.indexedDBLocalPersistence, au.browserLocalPersistence],
    })
    if (emulator) au.connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true })
  } catch {
    auth = au.getAuth(app) // already initialised (hot reload)
  }

  const authApi: AuthApi = {
    async signIn(email, password) {
      const { user } = await au.signInWithEmailAndPassword(auth, email, password)
      return { email: user.email }
    },
    signOut: () => au.signOut(auth),
    async currentUser() {
      await auth.authStateReady()
      return auth.currentUser ? { email: auth.currentUser.email } : null
    },
    sendPasswordReset: (email) => au.sendPasswordResetEmail(auth, email),
  }

  return { db: store, auth: authApi }
}

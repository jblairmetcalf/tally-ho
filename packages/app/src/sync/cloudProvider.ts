import {
  type Clock,
  emptyStore,
  type Game,
  migrate,
  type Player,
  type Preset,
  type Store,
  systemClock,
  withRoundIds,
} from '@tally/core'
import type { DataProvider } from '../provider'
import { diff, type Op } from './diff'
import {
  COLS,
  type Col,
  type DocData,
  deepEqual,
  gameFrom,
  keepOrder,
  playerFrom,
  presetFrom,
  splitGames,
} from './docs'
import type { FirestoreApi, FsDoc, FsError, FsSnapshot } from './firebase'
import {
  applyEntry,
  type OutboxEntry,
  readOutbox,
  retryable,
  toEntry,
  toOp,
  wireData,
  writeOutbox,
} from './outbox'
import { MIRROR_KEY, readJson, type StorageLike, writeJson } from './storage'

export interface Member {
  email: string
  name: string
  playerId: string
}

export type SyncState = 'synced' | 'pending' | 'offline' | 'error'

export interface SyncStatus {
  state: SyncState
  lastSyncedAt: number | null
  message?: string
}

/** A refused write: the rules said no (e.g. a round for a game another phone already ended). */
export interface Rejection {
  op: Op
  error: FsError
}

export interface CloudProvider extends DataProvider {
  subscribe(cb: (s: Store) => void): () => void
  /** Current status now, then on every change. */
  watchStatus(cb: (s: SyncStatus) => void): () => void
  /** A write the rules refused. */
  onRejected(cb: (r: Rejection) => void): () => void
  /** Stop listening and ignore further saves (sign-out). */
  dispose(): void
}

export interface CloudOptions {
  member: Member
  /** Firestore, or a promise of it (loaded lazily the first time it's needed). */
  db: FirestoreApi | (() => Promise<FirestoreApi>)
  /** The mirror's home. Default: localStorage. */
  storage: StorageLike | null
  clock?: Clock
  /** Default: `navigator.onLine`. */
  online?: () => boolean
  /** Starting point when there is no mirror yet (device prefs carry over). Default: empty. */
  fallback?: () => Store
  /** Told about failures nobody awaits. Default: console.warn. */
  onError?: (e: unknown) => void
}

const defaultOnline = () => {
  try {
    return typeof navigator === 'undefined' || navigator.onLine !== false
  } catch {
    return true
  }
}

/** The empty family record: default players and presets (what sign-in seeds), no samples. */
export function emptyFamilyStore(): Store {
  return { ...emptyStore(), hasSamples: false }
}

/**
 * The family's `DataProvider` over Firestore. `load()` is synchronous, from the on-device
 * mirror; `save` turns each change into fine-grained writes (see `diff`); snapshots of the
 * three collections are assembled into a Store and handed to `subscribe`rs, unless they say
 * nothing new. Firestore's own IndexedDB cache queues writes offline.
 */
export function createCloudProvider(opts: CloudOptions): CloudProvider {
  const { member, storage } = opts
  const clock = opts.clock ?? systemClock
  const online = opts.online ?? defaultOnline
  const onError =
    opts.onError ??
    ((e: unknown) => console.warn('[tally] sync:', e instanceof Error ? e.message : e))

  const fromMirror = () => {
    const s = migrate(readJson(storage, MIRROR_KEY))
    return s ? { ...s, hasSamples: false, games: s.games.filter((g) => !g.sample) } : null
  }
  let current: Store = withRoundIds(fromMirror() ?? opts.fallback?.() ?? emptyFamilyStore())
  let disposed = false

  // ── Firestore, lazily ──
  let db: FirestoreApi | null = typeof opts.db === 'function' ? null : opts.db
  let dbLoading: Promise<FirestoreApi> | null = null
  const getDb = (): Promise<FirestoreApi> => {
    if (db) return Promise.resolve(db)
    dbLoading ??= (opts.db as () => Promise<FirestoreApi>)().then(
      (d) => {
        db = d
        return d
      },
      (e: unknown) => {
        dbLoading = null
        throw e
      },
    )
    return dbLoading
  }

  // ── status ──
  const meta: Partial<Record<Col, { pending: boolean; cache: boolean }>> = {}
  let inflight = 0
  let listenError: FsError | null = null
  let lastSyncedAt: number | null = null
  let status: SyncStatus = { state: online() ? 'pending' : 'offline', lastSyncedAt }
  const statusSubs = new Set<(s: SyncStatus) => void>()
  const rejectSubs = new Set<(r: Rejection) => void>()

  const recompute = () => {
    const metas = COLS.map((c) => meta[c])
    const heardAll = metas.every(Boolean)
    const pending = inflight > 0 || metas.some((m) => m?.pending)
    const cache = !heardAll || metas.some((m) => m?.cache)
    let next: SyncStatus
    if (listenError)
      next = { state: 'error', lastSyncedAt, message: listenError.code ?? listenError.message }
    else if (!online()) next = { state: 'offline', lastSyncedAt }
    else if (pending || cache) next = { state: 'pending', lastSyncedAt }
    else {
      lastSyncedAt = clock.now()
      next = { state: 'synced', lastSyncedAt }
    }
    if (next.state === status.state && next.message === status.message) return
    status = next
    for (const cb of statusSubs) cb(status)
  }
  const onNetwork = () => {
    recompute()
    if (online() && !disposed) {
      queue.push(...retry.splice(0))
      drain()
      if (subs.size) listen()
    }
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', onNetwork)
    window.addEventListener('offline', onNetwork)
  }

  // ── writes: through a persisted outbox ──
  // Every write is recorded in `tallyho.outbox` before it is handed to Firestore and leaves
  // only once Firestore has settled it (confirmed, or refused for good). A phone killed before
  // the SDK loaded, or before the write reached the server, replays it on the next launch.
  let outbox: OutboxEntry[] = readOutbox(storage)
  let seq = outbox.reduce((m, e) => Math.max(m, e.seq), 0)
  const persist = () => writeOutbox(storage, outbox)
  /** Entries waiting for Firestore to load (or for the network, after a retryable failure). */
  const queue: OutboxEntry[] = outbox.slice()

  const settle = (e: OutboxEntry) => {
    outbox = outbox.filter((x) => x.seq !== e.seq)
    persist()
    // The overlay no longer holds this write up: show what Firestore says now.
    if (COLS.some((c) => docs[c])) emitTimer ??= setTimeout(emit, 0)
  }

  const send = (d: FirestoreApi, e: OutboxEntry) => {
    let p: Promise<void>
    if (e.type === 'delete') p = d.remove(e.col, e.id)
    else {
      const data = wireData(e, () => d.deleteField())
      p = e.type === 'set' ? d.set(e.col, e.id, data, true) : d.update(e.col, e.id, data)
    }
    inflight++
    recompute()
    p.then(
      () => settle(e),
      (err: FsError) => {
        if (err?.code === 'permission-denied')
          for (const cb of rejectSubs) cb({ op: toOp(e), error: err })
        else onError(err)
        if (retryable(err)) retry.push(e)
        else settle(e)
      },
    ).finally(() => {
      inflight--
      recompute()
    })
  }

  /** Retryable failures (a dead cache, a terminated client) go out again when back online. */
  const retry: OutboxEntry[] = []
  const drain = () => {
    if (disposed || !queue.length) return
    if (db) {
      for (const e of queue.splice(0)) send(db, e)
      return
    }
    getDb().then(() => drain(), onError)
  }
  const write = (ops: Op[]) => {
    const now = new Date(clock.now()).toISOString()
    const entries = ops.map((op) => toEntry(op, ++seq, now))
    outbox.push(...entries)
    persist()
    queue.push(...entries)
    drain()
  }

  // ── snapshots → Store ──
  const docs: Partial<Record<Col, FsDoc[]>> = {}
  const subs = new Set<(s: Store) => void>()
  let stops: (() => void)[] = []
  let listening = false
  let emitTimer: ReturnType<typeof setTimeout> | null = null

  /** A collection as Firestore reports it, with this phone's unconfirmed writes on top. */
  const view = (col: Col): FsDoc[] | undefined => {
    const base = docs[col]
    if (!base) return undefined
    const mine = outbox.filter((e) => e.col === col)
    if (!mine.length) return base
    const byId = new Map(base.map((d) => [d.id, d.data] as [string, DocData | undefined]))
    for (const e of mine) byId.set(e.id, applyEntry(byId.get(e.id), e))
    return [...byId].flatMap(([id, data]) => (data ? [{ id, data }] : []))
  }

  const assemble = (): Store => {
    const v = {
      players: view('players'),
      presets: view('presets'),
      games: view('games'),
    }
    const players = v.players
      ? keepOrder(
          current.players,
          v.players.map((d) => playerFrom(d.id, d.data)).filter((p): p is Player => !!p),
        )
      : current.players
    const presets = v.presets
      ? keepOrder(
          current.presets,
          v.presets.map((d) => presetFrom(d.id, d.data)).filter((p): p is Preset => !!p),
        )
      : current.presets
    const split = v.games
      ? splitGames(v.games.map((d) => gameFrom(d.id, d.data)).filter((g): g is Game => !!g))
      : { active: current.active, games: current.games }
    return {
      version: 3,
      players,
      presets,
      games: split.games,
      active: split.active,
      // Device-local: never synced.
      lastPlayerIds: current.lastPlayerIds,
      prefs: current.prefs,
      hasSamples: false,
    }
  }

  // Snapshots for several writes made in one tick arrive one by one; assemble once they settle.
  const emit = () => {
    emitTimer = null
    if (disposed) return
    const next = assemble()
    if (deepEqual(next, current)) return
    current = next
    writeJson(storage, MIRROR_KEY, next)
    for (const cb of subs) cb(next)
  }

  const onSnap = (col: Col) => (snap: FsSnapshot) => {
    if (disposed) return
    // A cold cache answers "nothing" before the server has spoken: keep the mirror instead.
    const cold = snap.fromCache && snap.docs.length === 0 && !docs[col]
    meta[col] = { pending: snap.hasPendingWrites, cache: snap.fromCache }
    if (snap.fromCache === false) listenError = null
    recompute()
    if (cold) return
    docs[col] = snap.docs
    emitTimer ??= setTimeout(emit, 0)
  }

  const listen = () => {
    if (listening) return
    listening = true
    getDb().then(
      (d) => {
        if (disposed || !listening) return
        stops = COLS.map((col) =>
          d.listen(col, onSnap(col), (e) => {
            listenError = e
            onError(e)
            recompute()
          }),
        )
      },
      (e: unknown) => {
        listening = false // try again when the network comes back
        onError(e)
      },
    )
  }

  const stopListening = () => {
    listening = false
    for (const s of stops) s()
    stops = []
  }

  // Replay what an earlier launch left unconfirmed.
  if (queue.length) drain()

  return {
    load: () => current,
    save(next) {
      if (disposed) return
      const ops = diff(current, next, member.playerId)
      current = next
      writeJson(storage, MIRROR_KEY, next)
      if (ops.length) write(ops)
    },
    subscribe(cb) {
      subs.add(cb)
      listen()
      return () => {
        subs.delete(cb)
        if (!subs.size) stopListening()
      }
    },
    watchStatus(cb) {
      statusSubs.add(cb)
      cb(status)
      return () => statusSubs.delete(cb)
    },
    onRejected(cb) {
      rejectSubs.add(cb)
      return () => rejectSubs.delete(cb)
    },
    dispose() {
      disposed = true
      stopListening()
      subs.clear()
      statusSubs.clear()
      rejectSubs.clear()
      if (emitTimer) clearTimeout(emitTimer)
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('online', onNetwork)
        window.removeEventListener('offline', onNetwork)
      }
    },
  }
}

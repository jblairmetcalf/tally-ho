import type { DocData } from './docs'
import type {
  AuthApi,
  AuthUser,
  FirebaseHandle,
  FirestoreApi,
  FsDoc,
  FsError,
  FsSnapshot,
} from './firebase'

type Docs = Map<string, Map<string, DocData>>

const DELETE = Symbol('fake.deleteField')

const fsError = (code: string, message = code): FsError =>
  Object.assign(new Error(message), { code })

const hasUndefined = (v: unknown): boolean =>
  v === undefined || (typeof v === 'object' && v !== null && Object.values(v).some(hasUndefined))

/** A deep copy that keeps the delete sentinel (structuredClone refuses symbols). */
function copy<T>(v: T): T {
  if (Array.isArray(v)) return v.map(copy) as T
  if (v instanceof Map) return new Map([...v].map(([k, x]) => [k, copy(x)])) as T
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) out[k] = copy(x)
    return out as T
  }
  return v
}

/** A queued write, as a fake client sends it. */
export type FakeWrite =
  | { kind: 'set'; col: string; id: string; data: DocData; merge: boolean }
  | { kind: 'update'; col: string; id: string; data: DocData }
  | { kind: 'remove'; col: string; id: string }

/** What the rules hook sees: the document before and after, and who is writing. */
export interface RuleCheck {
  write: FakeWrite
  before: DocData | undefined
  after: DocData | undefined
  client: FakeFirestore
}

/** Set a dotted path (`rounds.r1`) in a copy of `data`; `DELETE` removes it. */
function setPath(data: DocData, path: string, value: unknown) {
  const keys = path.split('.')
  let at: DocData = data
  for (const k of keys.slice(0, -1)) {
    const next = at[k]
    if (!next || typeof next !== 'object') at[k] = {}
    at = at[k] as DocData
  }
  const last = keys.at(-1)!
  if (value === DELETE) delete at[last]
  else at[last] = copy(value)
}

function mergeDeep(into: DocData, data: DocData) {
  for (const [k, v] of Object.entries(data)) {
    if (v === DELETE) delete into[k]
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      const cur = into[k]
      into[k] = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}
      mergeDeep(into[k] as DocData, v as DocData)
    } else into[k] = copy(v)
  }
}

/** The document after `w`, or undefined when it doesn't exist. Throws `not-found` for an
 * update of a missing document (`strict`, as the server does; the local cache ignores it). */
function apply(before: DocData | undefined, w: FakeWrite, strict: boolean): DocData | undefined {
  if (w.kind === 'remove') return undefined
  if (w.kind === 'set') {
    if (!w.merge || !before) {
      const out: DocData = {}
      mergeDeep(out, w.data)
      return out
    }
    const out = copy(before)
    mergeDeep(out, w.data)
    return out
  }
  if (!before) {
    if (strict) throw fsError('not-found', `No document to update: ${w.col}/${w.id}`)
    return undefined
  }
  const out = copy(before)
  for (const [k, v] of Object.entries(w.data)) setPath(out, k, v)
  return out
}

/**
 * The server: authoritative documents, shared by any number of `FakeFirestore` clients.
 * `rules` returns false to refuse a write (the client sees `permission-denied`).
 */
export class FakeBackend {
  readonly docs: Docs = new Map()
  readonly clients = new Set<FakeFirestore>()
  /** Every write the server accepted, in order. */
  readonly log: (FakeWrite & { client: FakeFirestore })[] = []
  rules: ((c: RuleCheck) => boolean) | null = null

  client(): FakeFirestore {
    const c = new FakeFirestore(this)
    this.clients.add(c)
    return c
  }

  get(col: string, id: string): DocData | undefined {
    const d = this.docs.get(col)?.get(id)
    return d && copy(d)
  }

  /** Seed (or overwrite) a document directly, as the console would. */
  put(col: string, id: string, data: DocData) {
    const m = this.docs.get(col) ?? new Map<string, DocData>()
    this.docs.set(col, m)
    m.set(id, copy(data))
    this.broadcast()
  }

  /** @internal */
  commit(w: FakeWrite, client: FakeFirestore) {
    const before = this.docs.get(w.col)?.get(w.id)
    const after = apply(before, w, true)
    if (this.rules && !this.rules({ write: w, before, after, client }))
      throw fsError('permission-denied', 'Missing or insufficient permissions.')
    const m = this.docs.get(w.col) ?? new Map<string, DocData>()
    this.docs.set(w.col, m)
    if (after) m.set(w.id, after)
    else m.delete(w.id)
    this.log.push({ ...w, client })
  }

  /** @internal */
  broadcast() {
    for (const c of this.clients) c.refresh()
  }
}

/** The completed-game rule from `firestore.rules`: once finished, only deletedAt may change. */
export function finishedGamesAreFinal({ write, before, after }: RuleCheck): boolean {
  if (write.col !== 'games' || before?.completedAt == null) return true
  if (!after) return false
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const k of keys) {
    if (k === 'deletedAt' || k === 'updatedAt') continue
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) return false
  }
  return true
}

interface Pending {
  write: FakeWrite
  resolve: () => void
  reject: (e: FsError) => void
}

interface Listener {
  col: string
  next: (s: FsSnapshot) => void
  last: string | null
}

/**
 * One phone's Firestore: a cache of what it last heard from the server plus its own queued
 * writes on top (the "latency-compensated" view). Writes go to the server one at a time,
 * asynchronously, while online; offline they wait. Snapshots are computed when something
 * changes and delivered asynchronously, like the real one. Readers get copies.
 */
export class FakeFirestore implements FirestoreApi {
  offline = false
  terminated = 0
  private known: Docs = new Map()
  private pending: Pending[] = []
  private listeners = new Set<Listener>()
  private flushing = false

  constructor(private backend: FakeBackend) {
    this.known = copy(backend.docs)
  }

  /** Go offline (writes queue, no snapshots from the server) or back online (flush). */
  setOffline(offline: boolean) {
    this.offline = offline
    if (!offline) {
      this.known = copy(this.backend.docs)
      this.flush()
    }
    this.notify()
  }

  /** Writes not yet confirmed by the server. */
  get pendingCount() {
    return this.pending.length
  }

  // ── FirestoreApi ──

  listen(col: string, next: (s: FsSnapshot) => void): () => void {
    const l: Listener = { col, next, last: null }
    this.listeners.add(l)
    this.deliver(l)
    return () => this.listeners.delete(l)
  }

  set(col: string, id: string, data: DocData, merge = false) {
    return this.enqueue({ kind: 'set', col, id, data: copy(data), merge })
  }

  update(col: string, id: string, data: DocData) {
    return this.enqueue({ kind: 'update', col, id, data: copy(data) })
  }

  remove(col: string, id: string) {
    return this.enqueue({ kind: 'remove', col, id })
  }

  async getServer(col: string, id: string): Promise<FsDoc | null> {
    if (this.offline)
      throw fsError('unavailable', 'Failed to get document because the client is offline.')
    const d = this.backend.get(col, id)
    return d ? { id, data: d } : null
  }

  async listServer(col: string): Promise<FsDoc[]> {
    if (this.offline) throw fsError('unavailable', 'The client is offline.')
    return [...(this.backend.docs.get(col) ?? [])].map(([id, data]) => ({ id, data: copy(data) }))
  }

  deleteField() {
    return DELETE
  }

  async terminate() {
    this.terminated++
    for (const p of this.pending) p.reject(fsError('cancelled', 'terminated'))
    this.pending = []
    this.listeners.clear()
    this.known = new Map()
  }

  // ── internals ──

  /** @internal The server changed: take its state (when online) and tell listeners. */
  refresh() {
    if (this.offline) return
    this.known = copy(this.backend.docs)
    this.notify()
  }

  private enqueue(write: FakeWrite): Promise<void> {
    if ('data' in write && hasUndefined(write.data))
      return Promise.reject(fsError('invalid-argument', 'Unsupported field value: undefined'))
    return new Promise<void>((resolve, reject) => {
      this.pending.push({ write, resolve, reject })
      this.notify()
      this.flush()
    })
  }

  /** Send queued writes to the server, in order, each on its own turn. */
  private flush() {
    if (this.flushing) return
    this.flushing = true
    const step = () => {
      const p = this.pending[0]
      if (!p || this.offline) {
        this.flushing = false
        return
      }
      this.pending.shift()
      try {
        this.backend.commit(p.write, this)
        p.resolve()
      } catch (e) {
        p.reject(e as FsError)
      }
      this.known = copy(this.backend.docs)
      this.backend.broadcast()
      this.notify()
      queueMicrotask(step)
    }
    queueMicrotask(step)
  }

  private view(col: string): { docs: Map<string, DocData>; pending: boolean } {
    const docs = new Map(this.known.get(col) ?? [])
    let pending = false
    for (const { write } of this.pending) {
      if (write.col !== col) continue
      pending = true
      const after = apply(docs.get(write.id), write, false)
      if (after) docs.set(write.id, after)
      else docs.delete(write.id)
    }
    return { docs, pending }
  }

  private snapshot(col: string): FsSnapshot {
    const { docs, pending } = this.view(col)
    return {
      docs: [...docs]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([id, data]) => ({ id, data: copy(data) })),
      hasPendingWrites: pending,
      fromCache: this.offline,
    }
  }

  /** Compute each listener's snapshot now; deliver it later, if anything changed. */
  private deliver(l: Listener) {
    const snap = this.snapshot(l.col)
    const key = JSON.stringify(snap)
    if (key === l.last) return
    l.last = key
    queueMicrotask(() => {
      if (this.listeners.has(l)) l.next(snap)
    })
  }

  private notify() {
    for (const l of this.listeners) this.deliver(l)
  }
}

/** Email/password accounts for tests. */
export class FakeAuth implements AuthApi {
  user: AuthUser | null = null
  /** Set to make every call fail as if offline. */
  offline = false
  resets: string[] = []
  constructor(readonly accounts: Record<string, string> = {}) {}

  async signIn(email: string, password: string) {
    if (this.offline) throw fsError('auth/network-request-failed')
    const known = this.accounts[email.toLowerCase()]
    if (known == null || known !== password) throw fsError('auth/invalid-credential')
    this.user = { email: email.toLowerCase() }
    return this.user
  }
  async signOut() {
    this.user = null
  }
  async currentUser() {
    return this.user
  }
  async sendPasswordReset(email: string) {
    if (this.offline) throw fsError('auth/network-request-failed')
    this.resets.push(email)
  }
}

/** A Firebase handle over the fakes. */
export function fakeHandle(
  backend = new FakeBackend(),
  auth = new FakeAuth(),
): FirebaseHandle & { db: FakeFirestore; auth: FakeAuth } {
  return { db: backend.client(), auth }
}

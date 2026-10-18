import { DELETE, NOW, type Op } from './diff'
import type { Col, DocData } from './docs'
import { OUTBOX_KEY, readJson, type StorageLike, writeJson } from './storage'

/** "Clear this field", in a form that survives JSON. */
const DELETE_MARK = { __tally: 'delete' } as const

const isDeleteMark = (v: unknown): boolean =>
  !!v && typeof v === 'object' && (v as { __tally?: unknown }).__tally === 'delete'

/**
 * A write this phone has made but Firestore has not yet confirmed, kept in localStorage so
 * it survives the app being killed before the SDK loaded or before the write reached the
 * server. Timestamps are resolved and `updatedAt` added when it is made, so a replay is the
 * same write. Writes are idempotent: set-merge, field updates, soft deletes.
 */
export interface OutboxEntry {
  seq: number
  type: Op['type']
  col: Col
  id: string
  data?: DocData
}

export function toEntry(op: Op, seq: number, now: string): OutboxEntry {
  if (op.type === 'delete') return { seq, type: 'delete', col: op.col, id: op.id }
  const data: DocData = {}
  for (const [k, v] of Object.entries(op.data))
    data[k] = v === DELETE ? DELETE_MARK : v === NOW ? now : v
  data.updatedAt = now
  return { seq, type: op.type, col: op.col, id: op.id, data }
}

/** Back to an `Op` (for `onRejected` listeners). */
export function toOp(e: OutboxEntry): Op {
  if (e.type === 'delete') return { type: 'delete', col: 'presets', id: e.id }
  const data: DocData = {}
  for (const [k, v] of Object.entries(e.data ?? {})) data[k] = isDeleteMark(v) ? DELETE : v
  return { type: e.type, col: e.col, id: e.id, data }
}

/** The entry's data for the SDK: delete marks become its `deleteField()` sentinel. */
export function wireData(e: OutboxEntry, deleteField: () => unknown): DocData {
  const out: DocData = {}
  for (const [k, v] of Object.entries(e.data ?? {})) out[k] = isDeleteMark(v) ? deleteField() : v
  return out
}

const isEntry = (v: unknown): v is OutboxEntry => {
  const e = v as OutboxEntry
  return (
    !!e &&
    typeof e.seq === 'number' &&
    (e.type === 'set' || e.type === 'update' || e.type === 'delete') &&
    (e.col === 'players' || e.col === 'presets' || e.col === 'games') &&
    typeof e.id === 'string'
  )
}

export function readOutbox(storage: StorageLike | null): OutboxEntry[] {
  const raw = readJson(storage, OUTBOX_KEY)
  return Array.isArray(raw) ? raw.filter(isEntry) : []
}

export function writeOutbox(storage: StorageLike | null, entries: OutboxEntry[]): void {
  writeJson(storage, OUTBOX_KEY, entries)
}

// ─────────────────────────── applying entries to documents ───────────────────────────

const isMap = (v: unknown): v is DocData =>
  !!v && typeof v === 'object' && !Array.isArray(v) && !isDeleteMark(v)

function mergeInto(into: DocData, data: DocData) {
  for (const [k, v] of Object.entries(data)) {
    if (isDeleteMark(v)) delete into[k]
    else if (isMap(v)) {
      const cur = into[k]
      const next: DocData = isMap(cur) ? { ...cur } : {}
      mergeInto(next, v)
      into[k] = next
    } else into[k] = structuredClone(v)
  }
}

function setPath(into: DocData, path: string, value: unknown) {
  const keys = path.split('.')
  let at = into
  for (const k of keys.slice(0, -1)) {
    const cur = at[k]
    const next: DocData = isMap(cur) ? { ...cur } : {}
    at[k] = next
    at = next
  }
  const last = keys.at(-1)!
  if (isDeleteMark(value)) delete at[last]
  else at[last] = structuredClone(value)
}

/**
 * The document as this phone means it to be after `e` (a view, never sent): a merge keeps
 * map entries it doesn't mention; an update of a missing document changes nothing.
 */
export function applyEntry(before: DocData | undefined, e: OutboxEntry): DocData | undefined {
  if (e.type === 'delete') return undefined
  if (e.type === 'set') {
    const out: DocData = before ? structuredClone(before) : {}
    mergeInto(out, e.data ?? {})
    return out
  }
  if (!before) return undefined
  const out = structuredClone(before)
  for (const [k, v] of Object.entries(e.data ?? {})) setPath(out, k, v)
  return out
}

/** Error codes worth trying again (next launch, or when the network returns). */
const RETRY = new Set([
  'cancelled',
  'unavailable',
  'failed-precondition',
  'aborted',
  'deadline-exceeded',
  'resource-exhausted',
  'internal',
  'unknown',
])

/** True when a failed write should stay in the outbox. Refusals and bad writes are final. */
export function retryable(e: unknown): boolean {
  const code = (e as { code?: unknown } | undefined)?.code
  return typeof code !== 'string' || RETRY.has(code)
}

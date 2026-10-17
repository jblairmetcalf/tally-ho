/** The slice of `Storage` sync needs, so tests can pass an in-memory one. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** Where the family record is mirrored on this phone: instant first paint, offline. */
export const MIRROR_KEY = 'tallyho.family'
/** Family writes not yet confirmed by Firestore (survives the app being killed). */
export const OUTBOX_KEY = 'tallyho.outbox'
/** The signed-in `Member` (JSON). Its presence boots the app straight into family mode. */
export const SESSION_KEY = 'tallyho.session'

/** `localStorage` when there is one and it works; null in SSR, tests or a blocked frame. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readJson(storage: StorageLike | null, key: string): unknown {
  try {
    const raw = storage?.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeJson(storage: StorageLike | null, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value))
  } catch {
    /* full or blocked: keep playing */
  }
}

export function removeKey(storage: StorageLike | null, key: string): void {
  try {
    storage?.removeItem(key)
  } catch {
    /* blocked */
  }
}

/** A Map-backed `StorageLike` for tests and stories. */
export function memoryStorage(): StorageLike & { readonly items: Map<string, string> } {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => {
      items.set(k, String(v))
    },
    removeItem: (k) => {
      items.delete(k)
    },
  }
}

import { migrate, type Store } from '@tally/core'

/**
 * Where the household's data lives. The app only ever talks to this seam, so a synced
 * provider (Firebase, a household hub…) can replace localStorage without touching screens.
 */
export interface DataProvider {
  /** The saved store, migrated to the current shape, or null on first run. */
  load(): Store | null
  /** Persist the whole store. May be debounced. */
  save(s: Store): void
  /** Changes made elsewhere (another tab, another phone). Returns an unsubscribe. */
  subscribe?(cb: (s: Store) => void): () => void
}

export const STORAGE_KEY = 'tallyho.v3'
/** The prototype's key. Read once on first load and migrated. */
const LEGACY_KEY = 'tallyho.v2'
const SAVE_DEBOUNCE_MS = 150

function read(key: string): Store | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? migrate(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

/** localStorage, debounced. Flushes on pagehide so a swipe-away never loses the last round. */
export function createLocalProvider(key = STORAGE_KEY, legacyKey = LEGACY_KEY): DataProvider {
  let pending: Store | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let listening = false

  const flush = () => {
    if (timer) clearTimeout(timer)
    timer = null
    if (!pending) return
    try {
      window.localStorage.setItem(key, JSON.stringify(pending))
    } catch {
      /* full or blocked: keep playing */
    }
    pending = null
  }

  const listen = () => {
    if (listening || typeof window === 'undefined') return
    listening = true
    try {
      window.addEventListener('pagehide', flush)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush()
      })
    } catch {
      /* no DOM */
    }
  }

  return {
    load() {
      if (typeof window === 'undefined') return null
      const current = read(key)
      if (current) return current
      // First launch after the prototype: upgrade its data and save it under the new key at
      // once, so the migration runs exactly once. The old key is left as a backup.
      const legacy = read(legacyKey)
      if (legacy) {
        try {
          window.localStorage.setItem(key, JSON.stringify(legacy))
        } catch {
          /* full or blocked: it migrates again next launch */
        }
      }
      return legacy
    },
    save(s) {
      if (typeof window === 'undefined') return
      listen()
      pending = s
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    subscribe(cb) {
      if (typeof window === 'undefined') return () => {}
      const onStorage = (e: StorageEvent) => {
        if (e.key !== key || !e.newValue) return
        try {
          const s = migrate(JSON.parse(e.newValue))
          if (s) cb(s)
        } catch {
          /* ignore a garbled write */
        }
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    },
  }
}

export const localProvider: DataProvider = createLocalProvider()

/** In-memory, for stories and tests. `saved` exposes the last write. */
export function memoryProvider(initial: Store | null = null): DataProvider & {
  readonly saved: Store | null
} {
  let saved: Store | null = initial ? structuredClone(initial) : null
  const subs = new Set<(s: Store) => void>()
  return {
    get saved() {
      return saved
    },
    load: () => (saved ? structuredClone(saved) : null),
    save(s) {
      saved = s
    },
    subscribe(cb) {
      subs.add(cb)
      return () => subs.delete(cb)
    },
  }
}

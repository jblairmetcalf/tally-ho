import { type Game, type Store, withRoundIds } from '@tally/core'
import { type Col, type DocData, deepEqual, gameDoc, playerDoc, presetDoc, roundDoc } from './docs'

/** Clears a field (Firestore's `deleteField()`). */
export const DELETE: unique symbol = Symbol('deleteField')
/** "Now", stamped by the provider when it writes (diff never reads the clock). */
export const NOW: unique symbol = Symbol('now')

/**
 * One Firestore write. `set` creates (or replaces) a whole document; `update` changes the
 * listed fields only (keys may be dotted paths: `rounds.<id>`); `delete` is presets only.
 * The provider adds `updatedAt` to every set and update.
 */
export type Op =
  | { type: 'set'; col: Col; id: string; data: DocData }
  | { type: 'update'; col: Col; id: string; data: DocData }
  | { type: 'delete'; col: 'presets'; id: string }

const GAME_FIELDS = [
  'name',
  'goal',
  'target',
  'lowWins',
  'playerIds',
  'startedAt',
  'completedAt',
  'winnerId',
] as const

/** Every game the family record holds: the live one and the finished ones. Samples never sync. */
function gamesOf(s: Store): Map<string, Game> {
  const all = [...(s.active ? [s.active] : []), ...s.games].filter((g) => !g.sample)
  return new Map(all.map((g) => [g.id, g]))
}

function byId<T extends { id: string }>(xs: T[]): Map<string, T> {
  return new Map(xs.map((x) => [x.id, x]))
}

/** Field-level changes between two docs of the same kind (absent in `next` → DELETE). */
function fieldChanges(prev: DocData, next: DocData): DocData {
  const out: DocData = {}
  for (const k of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    if (k === 'id') continue
    if (!deepEqual(prev[k], next[k])) out[k] = k in next ? next[k] : DELETE
  }
  return out
}

function gameChanges(prev: Game, next: Game, by: string): DocData {
  const out: DocData = {}
  const pd = gameDoc(prev)
  const nd = gameDoc(next)
  for (const k of GAME_FIELDS) if (!deepEqual(pd[k], nd[k])) out[k] = nd[k]
  // Who dealt it in only ever gets filled, never cleared.
  if (next.startedBy && next.startedBy !== prev.startedBy) out.startedBy = next.startedBy
  const before = new Map(prev.rounds.map((r) => [r.id ?? '', r]))
  const after = new Map(next.rounds.map((r) => [r.id ?? '', r]))
  for (const [id, r] of after) {
    const old = before.get(id)
    if (!old) out[`rounds.${id}`] = roundDoc(r, by)
    // `by` is who scored it: keep the original scorer through an edit.
    else if (!deepEqual(old.scores, r.scores) || old.at !== r.at)
      out[`rounds.${id}`] = roundDoc({ ...r, by: r.by ?? old.by })
  }
  for (const id of before.keys()) if (!after.has(id)) out[`rounds.${id}`] = DELETE
  return out
}

/**
 * The writes that turn `prev` into `next`, by id, with only the real changes. `by` is the
 * member's player id: it stamps new rounds and new games. A game that disappears is
 * soft-deleted (`deletedAt`); a player that disappears is left alone (players are never
 * deleted); a preset that disappears is deleted. Prefs and `lastPlayerIds` never sync.
 */
export function diff(prevIn: Store, nextIn: Store, by: string): Op[] {
  const prev = withRoundIds(prevIn)
  const next = withRoundIds(nextIn)
  const ops: Op[] = []

  const pp = byId(prev.players)
  for (const p of next.players) {
    const old = pp.get(p.id)
    if (!old) ops.push({ type: 'set', col: 'players', id: p.id, data: playerDoc(p) })
    else {
      const data = fieldChanges(playerDoc(old), playerDoc(p))
      if (Object.keys(data).length) ops.push({ type: 'update', col: 'players', id: p.id, data })
    }
  }

  const pr = byId(prev.presets)
  const nr = byId(next.presets)
  for (const p of next.presets) {
    const old = pr.get(p.id)
    if (!old) ops.push({ type: 'set', col: 'presets', id: p.id, data: presetDoc(p) })
    else {
      const doc = presetDoc(p)
      const data = fieldChanges(presetDoc(old), doc)
      // The player limits travel as a pair: the rules check max ≥ min on the merged doc, so a
      // lone field from one phone could meet the other's from another phone and be refused.
      if ('minPlayers' in data || 'maxPlayers' in data)
        for (const k of ['minPlayers', 'maxPlayers'] as const) data[k] = k in doc ? doc[k] : DELETE
      if (Object.keys(data).length) ops.push({ type: 'update', col: 'presets', id: p.id, data })
    }
  }
  for (const id of pr.keys()) if (!nr.has(id)) ops.push({ type: 'delete', col: 'presets', id })

  const pg = gamesOf(prev)
  const ng = gamesOf(next)
  for (const [id, g] of ng) {
    const old = pg.get(id)
    if (!old) ops.push({ type: 'set', col: 'games', id, data: gameDoc(g, by) })
    else {
      // One update per game: a final round and its completedAt land together (the rules
      // refuse anything but deletedAt once a game is finished).
      const data = gameChanges(old, g, by)
      if (Object.keys(data).length) ops.push({ type: 'update', col: 'games', id, data })
    }
  }
  for (const id of pg.keys())
    if (!ng.has(id)) ops.push({ type: 'update', col: 'games', id, data: { deletedAt: NOW } })

  return ops
}

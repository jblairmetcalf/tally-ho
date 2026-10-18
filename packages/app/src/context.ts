import { hash, PALETTE_SIZE, type Player } from '@tally/core'
import { createContext, useContext, useMemo } from 'react'
import { useStore } from 'zustand'
import type { TallyActions, TallyState, TallyStore } from './store'

export const TallyContext = createContext<TallyStore | null>(null)

export function useTallyStore(): TallyStore {
  const s = useContext(TallyContext)
  if (!s) throw new Error('Tally Ho! components must render inside <TallyApp>')
  return s
}

/** Select a slice of the app state. */
export function useTally<T>(selector: (s: TallyState) => T): T {
  return useStore(useTallyStore(), selector)
}

export const useActions = (): TallyActions => useTally((s) => s.actions)

export interface Roster {
  players: Player[]
  nameOf(id: string): string
  colorOf(id: string): number
  /** `{ id, name, color }` for a list of ids, in that order. */
  people(ids: string[]): { id: string; name: string; color: number }[]
}

/** Player lookups by id. Unknown ids fall back to the id and a palette slot by hash. */
function rosterOf(players: Player[]): Roster {
  const byId = new Map(players.map((p) => [p.id, p]))
  const nameOf = (id: string) => byId.get(id)?.name ?? id
  const colorOf = (id: string) => {
    const p = byId.get(id)
    return p ? p.color : hash(id) % PALETTE_SIZE
  }
  return {
    players,
    nameOf,
    colorOf,
    people: (ids) => ids.map((id) => ({ id, name: nameOf(id), color: colorOf(id) })),
  }
}

export function useRoster(): Roster {
  const players = useTally((s) => s.data.players)
  return useMemo(() => rosterOf(players), [players])
}

import { type Game, outcomesOf, plotOf, scheduleOf, songOf } from '@tally/core'
import type { StaffSong } from '@tally/ui'
import { useMemo } from 'react'
import { useRoster, useTally } from './context'

/**
 * A game's Fox Trot for the staff: every note (the riff, each round, the bass, and once it's
 * finished the coda that tells how it was won, from the family's history; decision 29).
 */
export function useStaff(g: Game | null | undefined): StaffSong {
  const roster = useRoster()
  const games = useTally((s) => s.data.games)
  const outcomes = useMemo(() => outcomesOf(games), [games])
  return useMemo(() => {
    if (!g) return { notes: [], length: 0 }
    const sched = scheduleOf(songOf(g, roster.colorOf, outcomes.get(g.id)))
    return { notes: plotOf(sched, roster.colorOf), length: sched.length }
  }, [g, roster, outcomes])
}

/** The shelf: the latest `n` finished games with a song (newest first). */
export function shelfOf(games: Game[], n = 6): Game[] {
  return games.filter((g) => g.completedAt && g.winnerId && g.rounds.length).slice(0, n)
}

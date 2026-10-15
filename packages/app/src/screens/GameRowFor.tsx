import { type CompletedGame, ranked, totalsOf } from '@tally/core'
import { GameRow } from '@tally/ui'
import type { Roster } from '../context'
import { useActions } from '../context'

/** A finished game as a GameRow; opens its detail sheet. */
export function GameRowFor({ game: g, roster }: { game: CompletedGame; roster: Roster }) {
  const a = useActions()
  const t = totalsOf(g)
  return (
    <GameRow
      name={g.name}
      winner={{ name: roster.nameOf(g.winnerId), color: roster.colorOf(g.winnerId) }}
      completedAt={g.completedAt}
      rounds={g.rounds.length}
      totals={ranked(g).map((id) => ({
        id,
        name: roster.nameOf(id),
        color: roster.colorOf(id),
        total: t[id] ?? 0,
        won: id === g.winnerId,
      }))}
      onClick={() => a.openSheet({ type: 'detail', id: g.id })}
    />
  )
}

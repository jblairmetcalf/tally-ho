import type { Game } from '@tally/core'
import { SongCard } from '@tally/ui'
import { useActions, useRoster, useTally } from '../context'
import { COPY, shortDate } from '../copy'
import { useStaff } from '../mixtape'

/** A finished game on the Fox Trot shelf: its song card, playing from the shelf (decision 27). */
export function SongCardFor({ game: g, isNew = false }: { game: Game; isNew?: boolean }) {
  const a = useActions()
  const roster = useRoster()
  const staff = useStaff(g)
  const song = useTally((s) => s.song)
  const winner = g.winnerId ?? ''
  const when = shortDate(g.completedAt ?? g.startedAt)
  // Any song of this game playing from the shelf (or Play all) lights this card.
  const playing = song?.gameId === g.id && (song.key === 'shelf' || song.key === 'all')
  return (
    <SongCard
      game={g.name}
      color={roster.colorOf(winner)}
      meta={COPY.foxTrot.meta(roster.nameOf(winner), when, g.rounds.length)}
      song={staff}
      playing={playing}
      isNew={isNew}
      onPlay={() => a.playSong(g.id, 'shelf')}
      onOpen={() => a.openSheet({ type: 'detail', id: g.id })}
      playLabel={playing ? COPY.foxTrot.stop(g.name) : COPY.foxTrot.play(g.name)}
      openLabel={COPY.foxTrot.open(g.name, roster.nameOf(winner), when)}
    />
  )
}

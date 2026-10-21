import { Children, type CSSProperties, isValidElement, type ReactNode } from 'react'
import { paletteVar } from '../brand/palette'
import { cx } from '../cx'
import { IconButton } from '../primitives/IconButton'
import { Staff, type StaffSong } from './Staff'

export interface SongCardProps {
  /** The game's name, on the cover. */
  game: string
  /** The winner's chip colour (palette index): the cover's colour. */
  color: number
  /** The line under the staff: winner, date, rounds. */
  meta: string
  /** The song (`plotOf` + its length). */
  song: StaffSong
  playing?: boolean
  /** Just pressed (the game finished since Home was last seen): it arrives with a pop. */
  isNew?: boolean
  onPlay: () => void
  onOpen: () => void
  /** Names (the app's copy): "Play Flip 7 song" / "Stop Flip 7 song", and the card's. */
  playLabel: string
  openLabel: string
}

/**
 * A song on the Fox Trot shelf: cover art in the winner's colour with a record that spins while
 * it plays, a mini staff, and who won, when and how long. The card opens the game; the play
 * button is its own 44px control beside it.
 */
export function SongCard({
  game,
  color,
  meta,
  song,
  playing = false,
  isNew = false,
  onPlay,
  onOpen,
  playLabel,
  openLabel,
}: SongCardProps) {
  return (
    <article
      className={cx('song-card', playing && 'playing', isNew && 'pressed')}
      style={{ '--c': paletteVar(color) } as CSSProperties}
    >
      <button type="button" className="song-open" onClick={onOpen} aria-label={openLabel}>
        <span className="song-cover">
          <span className="disc" aria-hidden="true" />
          <b>{game}</b>
        </span>
        <Staff notes={song.notes} length={song.length} playing={playing} size="mini" />
        <span className="song-meta">{meta}</span>
      </button>
      <span className="song-actions">
        <IconButton
          icon={playing ? 'stop' : 'play'}
          label={playLabel}
          on={playing}
          onClick={onPlay}
        />
      </span>
    </article>
  )
}

export interface MixtapeShelfProps {
  /** The row's accessible name ("Mixtape"). */
  label: string
  /** Shown instead of the row when there's nothing on it yet. */
  empty: string
  /** `SongCard`s. */
  children?: ReactNode
}

/** The Fox Trot shelf: song cards in one line that scrolls edge to edge, or the empty line. */
export function MixtapeShelf({ label, empty, children }: MixtapeShelfProps) {
  const cards = Children.toArray(children)
  if (!cards.length) return <p className="hint mixtape-empty">{empty}</p>
  return (
    <ul className="mixtape pills scroll" aria-label={label}>
      {cards.map((c, i) => (
        <li key={isValidElement(c) && c.key != null ? c.key : i}>{c}</li>
      ))}
    </ul>
  )
}

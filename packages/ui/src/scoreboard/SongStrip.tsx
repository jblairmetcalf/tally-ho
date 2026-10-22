import { Icon } from '../brand/Icon'
import { cx } from '../cx'
import { Staff, type StaffSong } from './Staff'

export interface SongStripProps {
  /** A small heading ("The song so far"). */
  title?: string
  /** Shown instead of the staff before there's a note ("Each round adds a note…"). */
  caption?: string
  /** The song (`plotOf` + its length); before its first round, the caption shows instead. */
  song: StaffSong
  /** A round whose notes light up (scoring it, hearing an edit). */
  pulse?: number | null
  highlight?: number | null
  /** Beats from this index on drop in as they arrive (the live game). */
  dropFrom?: number | null
  playing?: boolean
  onPlay: () => void
  /** The button's name: "Play Flip 7 song", "Stop Flip 7 song", "Hear it". */
  label: string
  /** On the victory overlay: no card behind it. */
  bare?: boolean
  /** A shorter staff, the title only before the first note (the game screen: scoring comes first). */
  compact?: boolean
}

/**
 * A game's song as one tappable strip (the Fox Trot, decision 27): its staff and a play/stop
 * button (44px) beside it; the staff itself is a picture, not a control. Before the first round,
 * its caption instead.
 */
export function SongStrip({
  title,
  caption,
  song,
  pulse = null,
  highlight = null,
  dropFrom = null,
  playing = false,
  onPlay,
  label,
  bare = false,
  compact = false,
}: SongStripProps) {
  // Before the first round there's only the riff: show the caption instead.
  const started = song.notes.some((n) => n.beat >= 0)
  return (
    <div className={cx('song-strip', bare && 'bare', compact && 'compact')}>
      {title && !compact && <span className="eyebrow">{title}</span>}
      {started ? (
        // The staff is a picture of the song; only the round button plays it.
        <div className="song-strip-row">
          <Staff
            notes={song.notes}
            length={song.length}
            playing={playing}
            pulse={pulse}
            highlight={highlight}
            dropFrom={dropFrom}
          />
          <button
            type="button"
            className={cx('song-strip-icon', playing && 'playing')}
            onClick={onPlay}
            aria-label={label}
          >
            <Icon name={playing ? 'stop' : 'play'} size={18} />
          </button>
        </div>
      ) : compact ? (
        // Holds the staff's height, so the first note arrives in place.
        <div className="song-strip-wait">
          {title && <span className="eyebrow">{title}</span>}
          {caption && <p className="hint song-strip-caption">{caption}</p>}
        </div>
      ) : (
        caption && <p className="hint song-strip-caption">{caption}</p>
      )}
    </div>
  )
}

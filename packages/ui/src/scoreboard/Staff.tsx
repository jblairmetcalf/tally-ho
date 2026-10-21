import { type CSSProperties, useEffect, useState } from 'react'
import { paletteVar } from '../brand/palette'
import { cx } from '../cx'

/** One note of a song, as the staff plots it. */
export interface StaffNote {
  /** When it starts and how long it sounds, in seconds from the song's start. */
  t: number
  dur: number
  midi: number
  /** The palette colour of whoever played it; null for the riff and the bass (nobody's). */
  color: number | null
  /** The bass sits small and faint; the melody, the riff and the coda are full notes. */
  kind: 'melody' | 'riff' | 'bass' | 'coda'
  /** The round it belongs to (-1 the riff, the number of rounds for the coda). */
  beat: number
}

/** A whole song for the staff: its notes and how long it lasts. */
export interface StaffSong {
  notes: StaffNote[]
  length: number
}

export interface StaffProps {
  /** Every note of the song (`scheduleOf` in @tally/core), placed by time and pitch. */
  notes: StaffNote[]
  /** The song's length in seconds. */
  length: number
  /** The song is playing from its start: each note lights up while it sounds. */
  playing?: boolean
  /** A round whose notes light up (scoring it, hearing an edit). */
  pulse?: number | null
  /** A round to mark (the one being edited). */
  highlight?: number | null
  /** `mini` for a song card; `full` scrolls sideways when the song is long. */
  size?: 'full' | 'mini'
  /** Rounds from this one on drop onto the staff as they arrive (the game screen). */
  dropFrom?: number | null
  /** The staff's name for screen readers ("Flip 7 fox trot"). Absent: decorative. */
  label?: string
  className?: string
}

/**
 * The Fox Trot's staff (decisions 27, 29): five faint lines and every note of the song placed by
 * time and pitch: the riff in ink, each round in the colour of whoever sang it, the bass small
 * underneath, the coda in the winner's colours. Playing, each note lights up while it sounds.
 */
export function Staff({
  notes,
  length,
  playing = false,
  pulse = null,
  highlight = null,
  size = 'full',
  dropFrom = null,
  label,
  className,
}: StaffProps) {
  const now = usePlayhead(playing, length)
  const tones = notes.map((n) => n.midi)
  const lo = tones.length ? Math.min(...tones) : 0
  const hi = tones.length ? Math.max(...tones) : 1
  const span = Math.max(12, hi - lo)
  const len = Math.max(length, 0.5)
  return (
    <div
      className={cx('staff', size, className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <div className="staff-row" style={{ '--len': len } as CSSProperties}>
        {notes.map((n, i) => {
          const on = (now != null && n.t <= now && now < n.t + n.dur) || n.beat === pulse
          return (
            <i
              // Notes are positions in the song; a new round only appends.
              key={i}
              data-beat={n.beat}
              className={cx(
                'note-at',
                dropFrom != null && n.beat >= dropFrom && n.kind !== 'coda' && 'drop',
                n.beat === highlight && 'hi',
              )}
              style={
                {
                  '--x': n.t / len,
                  '--y': (n.midi - lo) / span,
                } as CSSProperties
              }
            >
              <i
                className={cx('note', n.kind, on && 'on')}
                style={
                  n.color == null ? undefined : ({ '--c': paletteVar(n.color) } as CSSProperties)
                }
              />
            </i>
          )
        })}
      </div>
    </div>
  )
}

/** Seconds since `playing` turned on (frame by frame), or null while it's off. */
function usePlayhead(playing: boolean, length: number): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!playing || typeof requestAnimationFrame === 'undefined') {
      setNow(null)
      return
    }
    const start = performance.now()
    let frame = 0
    const tick = () => {
      const s = (performance.now() - start) / 1000
      setNow(s)
      if (s < length + 0.2) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, length])
  return now
}

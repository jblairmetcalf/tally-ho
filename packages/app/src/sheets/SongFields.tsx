import { keyOf, loopName, NOTE_NAMES, type SongKey } from '@tally/core'
import { Pill, PillRow, Segmented } from '@tally/ui'
import { COPY } from '../copy'

const M = COPY.foxTrot

export interface SongFieldsProps {
  /** The game type's name and low-wins flag: what Auto picks from. */
  name: string
  lowWins: boolean
  /** The picked key, or undefined for Auto. */
  song: SongKey | undefined
  /** A pick (or `undefined`: back to Auto). */
  onChange: (song: SongKey | undefined) => void
}

/**
 * The game type's Fox Trot key (decision 27): Auto (from the name, so every game of it sounds
 * alike) or a key, major or minor, and one of four chord loops. Games keep the key they were
 * dealt with, so changing it only changes games from now on.
 */
export function SongFields({ name, lowWins, song, onChange }: SongFieldsProps) {
  const auto = keyOf({ name: name || '?', lowWins })
  const cur = song ?? auto
  return (
    <div className="group">
      <span className="hint">{M.key}</span>
      <PillRow scroll label={M.key}>
        <Pill on={!song} onClick={() => onChange(undefined)}>
          {M.keyAuto}
        </Pill>
        {NOTE_NAMES.map((n, tonic) => (
          <Pill
            key={n}
            on={!!song && song.tonic === tonic}
            onClick={() => onChange({ ...cur, tonic })}
          >
            {n}
          </Pill>
        ))}
      </PillRow>
      {song ? (
        <>
          <Segmented
            label={M.modeLabel}
            options={[
              { value: 'major', label: M.mode.major },
              { value: 'minor', label: M.mode.minor },
            ]}
            value={song.mode}
            onChange={(mode) => onChange({ ...song, mode })}
          />
          <span className="hint">{M.loop}</span>
          <PillRow label={M.loop}>
            {[0, 1, 2, 3].map((loop) => (
              <Pill key={loop} on={song.loop === loop} onClick={() => onChange({ ...song, loop })}>
                {loopName(song.mode, loop)}
              </Pill>
            ))}
          </PillRow>
        </>
      ) : (
        <span className="hint">{M.keyAutoHint(name || COPY.settings.newGameName)}</span>
      )}
    </div>
  )
}

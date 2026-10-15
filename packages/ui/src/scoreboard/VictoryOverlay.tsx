import { useEffect, useRef } from 'react'
import { Fox } from '../brand/Fox'
import { FX } from '../feel/confetti'
import { SFX } from '../feel/sfx'
import { Button } from '../primitives/Button'
import { Podium, type PodiumRow } from './Podium'

export interface VictoryOverlayProps {
  /** The winner's name. */
  winner: string
  gameName: string
  /** The winner's total. */
  total: number
  /** Best first. */
  rows: PodiumRow[]
  onDone: () => void
  onRematch: () => void
}

/** When the losers' sting plays, after the fanfare (prototype timing). */
export const VICTORY_LOSE_MS = 2300

/**
 * The full-screen win: sunburst, crowned winking fox, the stamped name and the podium.
 * Fires the confetti cannon on mount and the losers' sting 2.3 s later. The caller plays `SFX.win`.
 */
export function VictoryOverlay({
  winner,
  gameName,
  total,
  rows,
  onDone,
  onRematch,
}: VictoryOverlayProps) {
  const rematchRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    FX.celebrate()
    const a = setTimeout(() => SFX.lose(), VICTORY_LOSE_MS)
    rematchRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') doneRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(a)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="victory" role="dialog" aria-modal="true" aria-label={`${winner} wins`}>
      <div className="sunburst" />
      <div className="v-badge">
        <Fox crown wink />
      </div>
      <div className="v-name">{winner}</div>
      <div className="v-sub">
        wins {gameName} with {total}
      </div>
      <Podium rows={rows} showLast />
      <div className="v-actions">
        <Button variant="ghost" onClick={onDone}>
          Done
        </Button>
        <Button ref={rematchRef} icon="repeat" onClick={onRematch}>
          Rematch
        </Button>
      </div>
    </div>
  )
}

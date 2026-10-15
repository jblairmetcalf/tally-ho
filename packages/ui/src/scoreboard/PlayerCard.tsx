import { type CSSProperties, useLayoutEffect, useRef } from 'react'
import { Chip } from '../brand/Chip'
import { paletteVar } from '../brand/palette'
import { cx } from '../cx'
import { RollNumber } from './RollNumber'

export interface PlayerCardProps {
  name: string
  color: number
  total: number
  /** The single leader: amber border, crown and amber total. */
  lead: boolean
  /** `match`: within reach of the target ("Match pt"). `danger`: low-wins player near bust. */
  near?: 'match' | 'danger' | null
  /** The score just added. Non-null bumps the card; non-zero also floats "+N" / "-N". */
  delta?: number | null
  /** Change it (e.g. per scored round) to replay the bump and delta float. */
  bumpKey?: string | number
  /** The line under the total ("12 to go", "+8 last round", "—"). */
  sub: string
  /** Change it to drop the crown again (a new leader). */
  crownKey?: string
}

/** A player's board card in the game screen (prototype `.pcard`). */
export function PlayerCard({
  name,
  color,
  total,
  lead,
  near = null,
  delta = null,
  bumpKey,
  sub,
  crownKey,
}: PlayerCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const bumping = delta != null
  const first = useRef(true)

  // A new bumpKey while already bumping: restart the CSS `bump` animation in place, so the
  // card (and its rolling total) isn't remounted.
  // biome-ignore lint/correctness/useExhaustiveDependencies: replay only when the key changes
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = ref.current
    if (!el || typeof el.getAnimations !== 'function') return
    for (const a of el.getAnimations()) {
      if ((a as CSSAnimation).animationName === 'bump') {
        a.cancel()
        a.play()
      }
    }
  }, [bumpKey])

  return (
    <div
      ref={ref}
      className={cx(
        'pcard',
        lead && 'lead',
        near === 'match' && 'match',
        near === 'danger' && 'danger',
        bumping && 'bump',
      )}
      style={{ '--c': paletteVar(color) } as CSSProperties}
    >
      <Chip name={name} color={color} size={40} crown={lead} crownKey={crownKey} />
      {near === 'match' && <span className="tag">Match pt</span>}
      {near === 'danger' && <span className="tag danger">Danger</span>}
      {delta != null && delta !== 0 && (
        <span key={bumpKey} className="delta">
          {delta > 0 ? '+' : ''}
          {delta}
        </span>
      )}
      <span className="pname">{name}</span>
      <span className="total">
        <RollNumber value={total} />
      </span>
      <span className="sub">{sub}</span>
    </div>
  )
}

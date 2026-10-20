import type { CSSProperties, ReactNode } from 'react'
import { Chip } from '../brand/Chip'
import { paletteVar } from '../brand/palette'
import { cx } from '../cx'

export interface StandingsProps {
  /** Most wins first. `move`: places climbed (+) or slipped (−) in the last game (passing someone, not drawing level); 0 or absent shows nothing. */
  rows: { id: string; name: string; color: number; wins: number; played: number; move?: number }[]
  /** The words for a move, for screen readers ("Up 1 place since the last game"). */
  moveLabel?: (move: number) => string
  /** A short line under each name (the sticker tally: "5 stickers · 7 to go"). */
  subOf?: (id: string) => string | undefined
  /** Makes each row a button (their sticker book); `pickLabel` names it. */
  onPick?: (id: string) => void
  pickLabel?: (id: string) => string
  /** A line under the heading (that the rows can be tapped). */
  hint?: string
  className?: string
}

/** A standings row: a plain row, or a button when a row opens something. */
function Row({
  onClick,
  label,
  className,
  style,
  children,
}: {
  onClick?: () => void
  label?: string
  className: string
  style: CSSProperties
  children: ReactNode
}) {
  return onClick ? (
    <button
      type="button"
      className={cx(className, 'stand-btn')}
      style={style}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  ) : (
    <div className={className} style={style}>
      {children}
    </div>
  )
}

/** ▲ or ▼ under the rank, with the count when it's more than one place. */
function Move({ move, label }: { move: number; label?: string }) {
  const up = move > 0
  const n = Math.abs(move)
  return (
    <span className={cx('move', up ? 'up' : 'down')} role="img" aria-label={label}>
      <svg viewBox="0 0 10 8" aria-hidden="true">
        <path d={up ? 'M5 0l5 8H0z' : 'M5 8L0 0h10z'} fill="currentColor" />
      </svg>
      {n > 1 && n}
    </span>
  )
}

/** The wins table: rank, chip, name with a growing bar, wins and win rate. */
export function Standings({
  rows,
  moveLabel,
  subOf,
  onPick,
  pickLabel,
  hint,
  className,
}: StandingsProps) {
  const maxW = Math.max(1, ...rows.map((r) => r.wins))
  // When anyone moved, unmoved ranks keep the mark's space so every number lines up.
  const anyMoved = rows.some((r) => r.move)
  return (
    <section className={cx('card', className)}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
        <h2 className="sec">Standings</h2>
        <span className="eyebrow">Wins</span>
      </div>
      {hint && <p className="hint stand-hint">{hint}</p>}
      {rows.map((x, i) => (
        <Row
          key={x.id}
          className="stand"
          style={{ '--i': i } as CSSProperties}
          onClick={onPick ? () => onPick(x.id) : undefined}
          label={onPick ? pickLabel?.(x.id) : undefined}
        >
          <span className={cx('rank', i === 0 && 'r1')}>
            {i + 1}
            {x.move ? (
              <Move move={x.move} label={moveLabel?.(x.move)} />
            ) : anyMoved ? (
              <span className="move" aria-hidden="true" />
            ) : null}
          </span>
          <Chip name={x.name} color={x.color} size={34} />
          <div className="min-w-0">
            <div className="truncate" style={{ fontWeight: 900 }}>
              {x.name}
            </div>
            {subOf?.(x.id) && <div className="stand-sub">{subOf(x.id)}</div>}
            <div className="bar">
              <i
                style={
                  {
                    '--c': paletteVar(x.color),
                    '--i': i,
                    width: `${(x.wins / maxW) * 100}%`,
                  } as CSSProperties
                }
              />
            </div>
          </div>
          <div className="wins">
            {x.wins}
            <small>{x.played ? Math.round((x.wins / x.played) * 100) : 0}%</small>
          </div>
        </Row>
      ))}
    </section>
  )
}

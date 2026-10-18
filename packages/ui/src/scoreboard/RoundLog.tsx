import type { Round } from '@tally/core'
import { type CSSProperties, useId } from 'react'
import { Icon } from '../brand/Icon'
import { paletteVar } from '../brand/palette'
import { cx } from '../cx'

export interface RoundLogProps {
  players: { id: string; name: string; color: number }[]
  rounds: Round[]
  /** Highlight each round's lowest score instead of its highest. */
  lowWins: boolean
  /** Rows are buttons ("Edit round N") with a pencil; otherwise plain rows. */
  editable: boolean
  /** Set/change it after scoring a round: the newest row slides in (`rowIn`). */
  freshKey?: string | number | null
  onEdit?: (idx: number) => void
  /**
   * Family sync: who scored each round. Given, rows whose round carries `by` show a tiny
   * initial chip after the round number ("scored by Kate" to screen readers).
   */
  nameOf?: (id: string) => string
  /**
   * `wins`: a "Who won?" game, where each round is one winner (1) and everyone else 0. The
   * winner's column shows a crown in their colour instead of the numbers.
   */
  mode?: 'scores' | 'wins'
  /** Wins mode: what screen readers hear for a round's winner. */
  wonLabel?: (name: string, round: number) => string
  className?: string
  style?: CSSProperties
}

/** The round-by-round table, newest first. The best score in each round wears its player's colour. */
export function RoundLog({
  players,
  rounds,
  lowWins,
  editable,
  freshKey = null,
  onEdit,
  nameOf,
  mode = 'scores',
  wonLabel = wonRound,
  className,
  style,
}: RoundLogProps) {
  const wins = mode === 'wins'
  const uid = useId()
  const order = rounds.map((r, i) => ({ r, i })).reverse()
  return (
    <section
      className={cx('card log', className)}
      style={{ '--n': players.length, ...style } as CSSProperties}
    >
      <div className="log-head">
        <span style={{ textAlign: 'left', paddingLeft: 4 }}>Rd</span>
        {players.map((p) => (
          <span key={p.id} className="pc" style={{ color: paletteVar(p.color) }}>
            {p.name}
          </span>
        ))}
        <span />
      </div>
      {order.map(({ r, i }, k) => {
        const vals = players.map((p) => r.scores[p.id]).filter((v): v is number => v != null)
        const best = vals.length ? (lowWins ? Math.min(...vals) : Math.max(...vals)) : null
        const isTop = (v: number | null | undefined) =>
          v != null && best != null && v === best && (lowWins || best > 0)
        const fresh = k === 0 && freshKey != null
        const by =
          nameOf && r.by ? { name: nameOf(r.by), p: players.find((p) => p.id === r.by) } : null
        const byId = by ? `${uid}-by-${i}` : undefined
        const winner = wins ? players.find((p) => (r.scores[p.id] ?? 0) > 0) : undefined
        const winId = winner ? `${uid}-won-${i}` : undefined
        const describedBy = [byId, winId].filter(Boolean).join(' ') || undefined
        const cells = (
          <>
            <span className="rn">
              {i + 1}
              {by && (
                <>
                  <b
                    className={cx('by', !by.p && 'by-guest')}
                    style={by.p ? ({ '--c': paletteVar(by.p.color) } as CSSProperties) : undefined}
                    aria-hidden="true"
                  >
                    {initial(by.name)}
                  </b>
                  <span id={byId} className="sr-only">
                    {scoredBy(by.name)}
                  </span>
                </>
              )}
            </span>
            {winner && (
              <span id={winId} className="sr-only">
                {wonLabel(winner.name, i + 1)}
              </span>
            )}
            {players.map((p) => {
              const v = r.scores[p.id]
              if (wins) {
                const won = winner?.id === p.id
                return (
                  <span
                    key={p.id}
                    className={cx('sc', won ? 'win' : 'nil')}
                    style={{ '--c': paletteVar(p.color) } as CSSProperties}
                    aria-hidden="true"
                  >
                    {won ? <Icon name="crown" size={20} /> : '·'}
                  </span>
                )
              }
              return (
                <span
                  key={p.id}
                  className={cx('sc', v == null && 'blank', isTop(v) && 'top')}
                  style={{ '--c': paletteVar(p.color) } as CSSProperties}
                >
                  {v == null ? '–' : v}
                </span>
              )
            })}
            <span className="ed">{editable && <Icon name="pencil" size={16} />}</span>
          </>
        )
        const key = fresh ? `${i}-${freshKey}` : String(i)
        return editable ? (
          <button
            key={key}
            type="button"
            className={cx('log-row', fresh && 'fresh')}
            aria-label={`Edit round ${i + 1}`}
            aria-describedby={describedBy}
            onClick={() => onEdit?.(i)}
          >
            {cells}
          </button>
        ) : (
          <div key={key} className={cx('log-row', fresh && 'fresh')}>
            {cells}
          </div>
        )
      })}
    </section>
  )
}

const initial = (name: string) => (Array.from(name.trim())[0] ?? '?').toUpperCase()
const scoredBy = (name: string) => `scored by ${name}`
const wonRound = (name: string, round: number) => `${name} won round ${round}`

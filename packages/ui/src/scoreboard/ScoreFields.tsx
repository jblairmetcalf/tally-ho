import { useRef } from 'react'
import { Chip } from '../brand/Chip'

export interface ScoreFieldsProps {
  players: { id: string; name: string; color: number }[]
  /** One raw string per player ('' is a blank, which counts as 0). */
  values: string[]
  onChange: (values: string[]) => void
  /** Enter on the last field (it blurs first). */
  onDone: () => void
  /** Input ids are `${idPrefix}${i}`. */
  idPrefix: string
  /** Fired after a ± flip (the caller plays `SFX.tap`). */
  onSign?: (index: number) => void
}

/** Prototype sanitising: digits and one leading minus, at most 6 characters. */
export const sanitizeScore = (v: string) =>
  v
    .replace(/[^0-9-]/g, '')
    .replace(/(?!^)-/g, '')
    .slice(0, 6)

/** One row per player: chip, name, ± and a big numeric input. Enter walks down the list. */
export function ScoreFields({
  players,
  values,
  onChange,
  onDone,
  idPrefix,
  onSign,
}: ScoreFieldsProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const set = (i: number, v: string) => {
    const n = values.slice()
    n[i] = v
    onChange(n)
  }
  return (
    <div className="fields">
      {players.map((p, i) => {
        const last = i === players.length - 1
        return (
          <div className="field-row" key={p.id}>
            <Chip name={p.name} color={p.color} size={36} />
            <span className="field-name">{p.name}</span>
            <button
              type="button"
              className="sign"
              aria-label={`Flip sign for ${p.name}`}
              onClick={() => {
                const v = values[i] ?? ''
                set(i, v.startsWith('-') ? v.slice(1) : `-${v}`)
                onSign?.(i)
              }}
            >
              ±
            </button>
            <input
              id={`${idPrefix}${i}`}
              ref={(el) => {
                refs.current[i] = el
              }}
              className="score-in"
              aria-label={`${p.name} score`}
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint={last ? 'done' : 'next'}
              placeholder="0"
              value={values[i] ?? ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => set(i, sanitizeScore(e.target.value))}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                if (!last) refs.current[i + 1]?.focus()
                else {
                  e.currentTarget.blur()
                  onDone()
                }
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

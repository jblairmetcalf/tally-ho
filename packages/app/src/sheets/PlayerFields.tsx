import { MAX_PLAYERS, MIN_PLAYERS, type PlayerRange } from '@tally/core'
import { TextInput } from '@tally/ui'
import { useId, useState } from 'react'
import { COPY } from '../copy'

const N = COPY.newGame

/** Typed counts → a range the rules accept: 2–12, Most never below Fewest, blank Most = no limit. */
function parseRange(min: string, max: string): PlayerRange {
  const clamp = (n: number) => Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, n))
  const lo = clamp(Number.parseInt(min, 10) || MIN_PLAYERS)
  const hi = Number.parseInt(max, 10)
  return { min: lo, max: Number.isNaN(hi) ? null : Math.max(lo, clamp(hi)) }
}

export interface PlayerFieldsProps {
  range: PlayerRange
  /** A settled range (on blur, or Enter): already clamped and ordered. */
  onChange: (range: PlayerRange) => void
}

/**
 * How many can play: Fewest and Most, side by side. Typing is free; leaving a field settles it
 * (clamped to 2–12, Most never below Fewest, Most left blank = no limit) and shows what stuck.
 */
export function PlayerFields({ range, onChange }: PlayerFieldsProps) {
  const [min, setMin] = useState(String(range.min))
  const [max, setMax] = useState(range.max == null ? '' : String(range.max))
  const id = useId()
  const settle = () => {
    const next = parseRange(min, max)
    setMin(String(next.min))
    setMax(next.max == null ? '' : String(next.max))
    if (next.min !== range.min || next.max !== range.max) onChange(next)
  }
  const field = (
    key: string,
    label: string,
    value: string,
    set: (v: string) => void,
    placeholder?: string,
  ) => (
    <div className="field-label">
      <label className="hint" htmlFor={`${id}-${key}`}>
        {label}
      </label>
      <TextInput
        id={`${id}-${key}`}
        className="num"
        inputMode="numeric"
        enterKeyHint="done"
        value={value}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onBlur={settle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
      />
    </div>
  )
  return (
    <div className="group">
      <div className="row2">
        {field('min', N.fewestPlayers, min, setMin)}
        {field('max', N.mostPlayers, max, setMax, N.anyNumber)}
      </div>
      <span className="hint">{N.playersHint}</span>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

export interface RollNumberProps {
  value: number
}

const STEPS = 18
const TICK_MS = 22

/** A number that counts to its new value: 18 ease-out-cubic steps, 22 ms apart (prototype `Roll`). */
export function RollNumber({ value }: RollNumberProps) {
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    let i = 0
    const iv = setInterval(() => {
      i++
      const e = 1 - (1 - i / STEPS) ** 3
      setShown(Math.round(from + (value - from) * e))
      if (i >= STEPS) {
        clearInterval(iv)
        setShown(value)
      }
    }, TICK_MS)
    return () => clearInterval(iv)
  }, [value])
  return <span className="num">{shown}</span>
}

import type { KeyboardEvent } from 'react'

/**
 * Arrow-key handling for a radiogroup of buttons: Left/Up and Right/Down move (and wrap),
 * Home/End jump. Moves focus to the new radio and returns its index so the caller can select it.
 */
export function rovingKey(
  e: KeyboardEvent<HTMLElement>,
  index: number,
  count: number,
): number | null {
  let next: number | null = null
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % count
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + count) % count
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = count - 1
  if (next == null) return null
  e.preventDefault()
  const group = e.currentTarget.closest('[role="radiogroup"]')
  const radios = group?.querySelectorAll<HTMLElement>('[role="radio"]')
  radios?.[next]?.focus()
  return next
}

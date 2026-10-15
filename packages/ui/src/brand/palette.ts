import { PALETTE_SIZE } from '@tally/core'

/** The eight chip colours, for canvas/SVG code that needs a literal (confetti, chart exports). */
export const PLAYER_COLORS = [
  '#00D4AA',
  '#FFB800',
  '#FF7A3D',
  '#A78BFA',
  '#FF4D6D',
  '#5CC8FF',
  '#F7E9D2',
  '#8BE07A',
] as const

export const PLAYER_COLOR_NAMES = [
  'Jade',
  'Amber',
  'Tangerine',
  'Lavender',
  'Coral',
  'Sky',
  'Cream',
  'Clover',
] as const

/** CSS custom property for palette slot i (wraps). Prefer this in components. */
export const paletteVar = (i: number) =>
  `var(--p${((i % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE})`

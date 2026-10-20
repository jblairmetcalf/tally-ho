import type { CSSProperties } from 'react'
import { cx } from '../cx'
import { ICONS, type IconName } from './Icon'

export type StickerTone = 'amber' | 'fox' | 'jade' | 'lav' | 'coral' | 'sky'
export type StickerShape = 'circle' | 'burst' | 'hex' | 'square'

/** A 28-point starburst on the 100×100 sticker grid. */
const BURST = (() => {
  let d = ''
  const points = 14
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? 39 : 46
    const a = (Math.PI * i) / points - Math.PI / 2
    d += `${i ? 'L' : 'M'}${(50 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)}`
  }
  return `${d}Z`
})()

const SHAPES: Record<Exclude<StickerShape, 'circle'>, string> = {
  burst: BURST,
  hex: 'M50 6 L88 28 V72 L50 94 L12 72 V28 Z',
  square:
    'M24 10 H76 A14 14 0 0 1 90 24 V76 A14 14 0 0 1 76 90 H24 A14 14 0 0 1 10 76 V24 A14 14 0 0 1 24 10 Z',
}

/** The accent behind each tone (sky is the sixth player colour). */
const TONE: Record<StickerTone, string> = {
  amber: 'var(--amber)',
  fox: 'var(--fox)',
  jade: 'var(--jade)',
  lav: 'var(--lav)',
  coral: 'var(--coral)',
  sky: 'var(--p5)',
}

export interface StickerProps {
  /**
   * The sticker's name, for screen readers ("Hat Trick", or "Hat Trick, not yet"). Leave it out
   * when the sticker sits in a control that's named already: it's then decorative.
   */
  label?: string
  tone: StickerTone
  icon: IconName
  shape: StickerShape
  /** Not earned yet: a dashed outline where the sticker would go. */
  locked?: boolean
  /** How many they have; 2 or more shows a ×N badge. */
  count?: number
  /** Degrees; stickers are never quite straight. */
  tilt?: number
  size?: number
  className?: string
  style?: CSSProperties
}

/**
 * A die-cut sticker (the Sticker Club): a coloured shape with a white border and a soft
 * shadow, its glyph in the middle. Locked, it's a dashed outline of the same shape.
 */
export function Sticker({
  label,
  tone,
  icon,
  shape,
  locked = false,
  count = 0,
  tilt = 0,
  size = 72,
  className,
  style,
}: StickerProps) {
  return (
    <span
      className={cx('sticker', locked && 'locked', className)}
      style={
        {
          '--tone': TONE[tone],
          width: size,
          height: size,
          transform: tilt ? `rotate(${tilt}deg)` : undefined,
          ...style,
        } as CSSProperties
      }
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        {shape === 'circle' ? (
          <circle cx="50" cy="50" r="43" className="bg" />
        ) : (
          <path d={SHAPES[shape]} className="bg" />
        )}
        <g
          className="ic"
          transform="translate(29 29) scale(1.75)"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static icon paths from Icon.tsx
          dangerouslySetInnerHTML={{ __html: ICONS[icon] }}
        />
      </svg>
      {count > 1 && !locked && <span className="count">×{count}</span>}
    </span>
  )
}

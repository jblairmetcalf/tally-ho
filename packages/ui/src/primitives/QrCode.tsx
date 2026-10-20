import { type CSSProperties, useEffect, useState } from 'react'
import { Fox } from '../brand/Fox'

/** A QR code as modules: `data[y][x]` is true for a dark module. No quiet zone. */
export interface QrMatrix {
  size: number
  data: boolean[][]
}

/**
 * Encode `value` as a QR matrix with high error correction (H: up to 30% of the code can be
 * covered, which is what lets the fox sit in the middle). The encoder (`uqr`) is imported on
 * demand so it never weighs on the app's first paint.
 */
export async function encodeQr(value: string): Promise<QrMatrix> {
  const { encode } = await import('uqr')
  const { size, data } = encode(value, { ecc: 'H', border: 0 })
  return { size, data }
}

/**
 * The matrix for `value`, encoded lazily: null until it's ready (or when `value` is null),
 * 'failed' if the encoder couldn't load (offline before it was ever cached).
 */
function useQrMatrix(value: string | null): QrMatrix | 'failed' | null {
  const [done, setDone] = useState<{ value: string; matrix: QrMatrix | 'failed' } | null>(null)
  useEffect(() => {
    if (value == null) return
    let alive = true
    encodeQr(value).then(
      (matrix) => {
        if (alive) setDone({ value, matrix })
      },
      () => {
        if (alive) setDone({ value, matrix: 'failed' })
      },
    )
    return () => {
      alive = false
    }
  }, [value])
  return done && done.value === value ? done.matrix : null
}

/** True inside one of the three 7×7 finder patterns (the corner "eyes"), drawn on their own. */
export function inEye(size: number, x: number, y: number): boolean {
  const near = (v: number) => v < 7
  const far = (v: number) => v >= size - 7
  return (near(x) && near(y)) || (far(x) && near(y)) || (near(x) && far(y))
}

/** The dot radius, in modules: round, with a hair of space between neighbours. */
const DOT = 0.43

/**
 * One SVG path with a round dot for every dark module outside the eyes. Each dot is a circle
 * of two arcs, so the whole code is a single element however many modules it has.
 */
export function qrDots({ size, data }: QrMatrix): string {
  let d = ''
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (!dark || inEye(size, x, y)) return
      d += `M${x + 0.5 - DOT} ${y + 0.5}a${DOT} ${DOT} 0 1 0 ${DOT * 2} 0a${DOT} ${DOT} 0 1 0 -${DOT * 2} 0`
    })
  })
  return d
}

/** The top-left corner of each eye: top left, top right, bottom left. */
export const eyesOf = (size: number): [number, number][] => [
  [0, 0],
  [size - 7, 0],
  [0, size - 7],
]

/** Modules of quiet zone around the code, inside the plate. */
const QUIET = 3

export interface QrCodeProps {
  /** What the code opens (a URL). Encoded lazily unless `matrix` is given. */
  value: string
  /** The accessible name ("QR code for https://…"). */
  label: string
  /** Width of the plate in px (the code scales to fit). Default 208. */
  size?: number
  /** The fox on its ink disc in the middle (≈20% of the width; safe at error correction H). */
  badge?: boolean
  /**
   * A precomputed matrix (stories, tests). Omitted: `value` is encoded on demand, and a quiet
   * placeholder holds the same square until it's ready, so nothing moves.
   */
  matrix?: QrMatrix | null
}

/**
 * A scannable QR code in the brand's dress: ink dots on a cream plate in a jade ring, rounded
 * eyes in deep jade with a deep-fox centre, and the fox in the middle. Always dark on light, in
 * both themes (that's what phone cameras read best); the eyes use the deep tones so they still
 * read as dark. Error correction H lets the badge cover the centre.
 */
export function QrCode({ value, label, size = 208, badge = false, matrix }: QrCodeProps) {
  const lazy = useQrMatrix(matrix === undefined ? value : null)
  const failed = lazy === 'failed'
  const m = matrix ?? (failed ? null : lazy)
  const span = m ? m.size + QUIET * 2 : 0
  return (
    <div className="qr" style={{ '--qr-size': `${size}px` } as CSSProperties}>
      {m ? (
        <svg role="img" aria-label={label} viewBox={`${-QUIET} ${-QUIET} ${span} ${span}`}>
          <path className="qr-dots" d={qrDots(m)} />
          {eyesOf(m.size).map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <rect className="qr-eye" x={x + 0.5} y={y + 0.5} width={6} height={6} rx={1.9} />
              <rect className="qr-pupil" x={x + 2} y={y + 2} width={3} height={3} rx={0.9} />
            </g>
          ))}
        </svg>
      ) : failed ? (
        // No encoder (offline before it was cached): the address itself, so there's a way on.
        <span className="qr-fallback selectable">{value}</span>
      ) : (
        <span className="qr-wait" role="img" aria-label={label} aria-busy="true" />
      )}
      {badge && !failed && (
        <span className="qr-badge" aria-hidden="true">
          <Fox />
        </span>
      )}
    </div>
  )
}

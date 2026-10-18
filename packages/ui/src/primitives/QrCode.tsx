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

/** One SVG path for every dark module, a horizontal run at a time (crisp at any size). */
export function qrPath({ data }: QrMatrix): string {
  let d = ''
  data.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x++
        continue
      }
      let run = 1
      while (row[x + run]) run++
      d += `M${x} ${y}h${run}v1h-${run}z`
      x += run
    }
  })
  return d
}

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
 * A scannable QR code: ink modules on a white plate with a rounded quiet zone. Always dark on
 * light, in both themes, because that's what phone cameras read best.
 */
export function QrCode({ value, label, size = 208, badge = false, matrix }: QrCodeProps) {
  const lazy = useQrMatrix(matrix === undefined ? value : null)
  const failed = lazy === 'failed'
  const m = matrix ?? (failed ? null : lazy)
  const span = m ? m.size + QUIET * 2 : 0
  return (
    <div className="qr" style={{ '--qr-size': `${size}px` } as CSSProperties}>
      {m ? (
        <svg
          role="img"
          aria-label={label}
          viewBox={`${-QUIET} ${-QUIET} ${span} ${span}`}
          shapeRendering="crispEdges"
        >
          <path d={qrPath(m)} fill="currentColor" />
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

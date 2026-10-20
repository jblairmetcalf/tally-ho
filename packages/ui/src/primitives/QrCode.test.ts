import { encode } from 'uqr'
import { describe, expect, it } from 'vitest'
import { encodeQr, eyesOf, inEye, qrDots } from './QrCode'

/** Read the dots back off the path (each starts `M{x + .5 - r} {y + .5}a…`) onto a grid. */
function paintDots(d: string, size: number): boolean[][] {
  const grid = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  for (const m of d.matchAll(/M([\d.]+) ([\d.]+)a/g)) {
    const x = Math.round(Number(m[1]) + 0.43 - 0.5)
    const y = Math.round(Number(m[2]) - 0.5)
    expect(grid[y]![x]).toBe(false) // one dot per module
    grid[y]![x] = true
  }
  return grid
}

/** A finder pattern as the standard draws it: a 7×7 ring around a 3×3 centre. */
const finder = (dx: number, dy: number) =>
  dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)

describe('QrCode', () => {
  const url = 'https://tally-ho.vercel.app/'

  it('encodes at error correction H with no border (the plate is the quiet zone)', async () => {
    const m = await encodeQr(url)
    const ref = encode(url, { ecc: 'H', border: 0 })
    expect(m.size).toBe(ref.size)
    expect(m.data).toEqual(ref.data)
    // Finder pattern in the top-left corner: a solid 7-module ring.
    expect(m.data[0]!.slice(0, 7)).toEqual(Array(7).fill(true))
  })

  it('draws every dark module: dots outside the eyes, and eyes that match the finder patterns', async () => {
    for (const value of [
      url,
      'http://localhost:3101/',
      'https://example.com/a/much/longer/path?x=1',
    ]) {
      const m = await encodeQr(value)
      const dots = paintDots(qrDots(m), m.size)
      for (let y = 0; y < m.size; y++)
        for (let x = 0; x < m.size; x++) {
          if (inEye(m.size, x, y)) expect(dots[y]![x]).toBe(false)
          else expect(dots[y]![x]).toBe(m.data[y]![x])
        }
      // The drawn eyes (ring + centre) are exactly the code's finder patterns.
      for (const [ex, ey] of eyesOf(m.size))
        for (let dy = 0; dy < 7; dy++)
          for (let dx = 0; dx < 7; dx++) expect(m.data[ey + dy]![ex + dx]).toBe(finder(dx, dy))
    }
  })
})

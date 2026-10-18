import { encode } from 'uqr'
import { describe, expect, it } from 'vitest'
import { encodeQr, qrPath } from './QrCode'

/** Paint the SVG path's runs back onto a grid, to compare with the encoder's modules. */
function paint(d: string, size: number): boolean[][] {
  const grid = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) {
    const [x, y, run] = [Number(m[1]), Number(m[2]), Number(m[3])]
    expect(Number(m[4])).toBe(run)
    for (let i = 0; i < run; i++) {
      expect(grid[y]![x + i]).toBe(false) // runs never overlap
      grid[y]![x + i] = true
    }
  }
  return grid
}

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

  it('draws exactly the dark modules, module for module', async () => {
    for (const value of [
      url,
      'http://localhost:3101/',
      'https://example.com/a/much/longer/path?x=1',
    ]) {
      const m = await encodeQr(value)
      expect(paint(qrPath(m), m.size)).toEqual(m.data)
    }
  })
})

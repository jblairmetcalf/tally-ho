import tokensCss from '../../../../packages/ui/src/styles/tokens.css?raw'

/** Token values per theme, read from tokens.css itself so this page can never drift. */
export type TokenMap = Record<string, string>

function parse(css: string) {
  const dark: TokenMap = {}
  const light: TokenMap = {}
  const shared: TokenMap = {}
  const block = /([^{}]+)\{([^{}]*)\}/g
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(block)) {
    const sel = m[1]?.trim() ?? ''
    const body = m[2] ?? ''
    const target = sel.includes('light')
      ? light
      : sel.includes('dark')
        ? dark
        : sel === ':root'
          ? shared
          : null
    if (!target) continue
    for (const d of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      if (d[1] && d[2]) target[d[1]] = d[2].replace(/\s+/g, ' ').trim()
    }
  }
  return { dark: { ...shared, ...dark }, light: { ...shared, ...dark, ...light } }
}

export const TOKENS = parse(tokensCss)

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m?.[1]) return null
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  const n = Number.parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance([r, g, b]: [number, number, number]) {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG 2.x contrast ratio between two hex colours, or null if either isn't a hex. */
export function contrast(a: string, b: string): number | null {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  if (!x || !y) return null
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

export type Grade = 'AAA' | 'AA' | 'AA large' | 'UI 3:1' | 'Fail'

/** Grade for text (default) or for non-text UI (fills, chips, outlines: 3:1). */
export function grade(ratio: number, kind: 'text' | 'ui' = 'text'): Grade {
  if (kind === 'ui') return ratio >= 3 ? 'UI 3:1' : 'Fail'
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA large'
  return 'Fail'
}

export const gradeTone = (g: Grade) =>
  g === 'AAA' || g === 'AA' || g === 'UI 3:1' ? 'jade' : g === 'AA large' ? 'amber' : 'coral'

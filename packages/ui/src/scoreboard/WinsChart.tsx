import type { CSSProperties } from 'react'
import { paletteVar } from '../brand/palette'

export interface WinsChartProps {
  /** Cumulative wins per player, starting at 0 (core `winSeries`), named and coloured. */
  series: { id: string; name: string; color: number; pts: number[] }[]
}

const W = 340
const H = 160
const L = 20
const R = 64
const T = 12
const B = 26
/** Minimum vertical gap between end labels. */
const GAP = 14

/** "Who's winning over time": a step line per player that draws itself in. Needs 2+ games. */
export function WinsChart({ series }: WinsChartProps) {
  const N = Math.max(0, ...series.map((s) => s.pts.length - 1))
  if (N < 2 || !series.length) return null
  const at = (s: { pts: number[] }, k: number) => s.pts[Math.min(k, s.pts.length - 1)] ?? 0
  const max = Math.max(1, ...series.map((s) => at(s, N)))
  const x = (i: number) => L + (i / N) * (W - L - R)
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  const ticks = max >= 4 ? [0, Math.round(max / 2), max] : [0, max]

  const ends = series.map((s) => ({ s, v: at(s, N), y: y(at(s, N)) })).sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i++) {
    const prev = ends[i - 1]!
    const cur = ends[i]!
    if (cur.y - prev.y < GAP) cur.y = prev.y + GAP
  }

  const label = `Cumulative wins per player across ${N} games: ${[...ends]
    .sort((a, b) => b.v - a.v)
    .map((e) => `${e.s.name} ${e.v}`)
    .join(', ')}`

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={L} x2={W - R + 6} y1={y(t)} y2={y(t)} strokeDasharray="3 5" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      <text x={L} y={H - 6}>
        Start
      </text>
      <text x={x(N)} y={H - 6} textAnchor="end">
        {`Game ${N}`}
      </text>
      {series.map((s, i) => {
        let d = `M${x(0)},${y(0)}`
        for (let k = 1; k <= N; k++) d += `H${x(k)}V${y(at(s, k))}`
        return (
          <path
            key={s.id}
            className="ln"
            d={d}
            pathLength={1}
            stroke={paletteVar(s.color)}
            style={{ '--i': i } as CSSProperties}
          />
        )
      })}
      {ends.map((e) => (
        <g key={e.s.id}>
          <circle
            className="dot"
            cx={x(N)}
            cy={y(e.v)}
            r={4.5}
            fill={paletteVar(e.s.color)}
            strokeWidth={2}
          />
          <text className="lbl" x={x(N) + 10} y={e.y + 4} style={{ fill: paletteVar(e.s.color) }}>
            {e.s.name} {e.v}
          </text>
        </g>
      ))}
    </svg>
  )
}

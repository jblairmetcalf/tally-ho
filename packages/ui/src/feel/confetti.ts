import { SUITS } from './suits'

/**
 * Suit-shaped confetti on one shared full-screen canvas (mounted by <FxCanvas/>).
 * A verbatim port of the prototype's FX module. Skips entirely under reduced motion.
 */

interface Part {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  vr: number
  s: number
  f: number
  p: Path2D
  col: string
  life: number
}
export interface BurstOpts {
  angle?: number
  spread?: number
  power?: number
  colors?: string[]
}

const COLS = ['#00D4AA', '#FFB800', '#FF6A1F', '#A78BFA', '#FF4D6D', '#F7E9D2']

let cv: HTMLCanvasElement | null = null
let c: CanvasRenderingContext2D | null = null
let parts: Part[] = []
let raf: number | null = null
let dpr = 1
let paths: Path2D[] = []

function size() {
  if (!cv) return
  dpr = Math.min(2, window.devicePixelRatio || 1)
  cv.width = window.innerWidth * dpr
  cv.height = window.innerHeight * dpr
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Called by <FxCanvas/>. Returns a detach function. */
export function attachCanvas(el: HTMLCanvasElement): () => void {
  cv = el
  c = el.getContext('2d')
  paths = Object.values(SUITS).map((d) => new Path2D(d))
  size()
  window.addEventListener('resize', size)
  return () => {
    window.removeEventListener('resize', size)
    if (raf) cancelAnimationFrame(raf)
    raf = null
    parts = []
    if (cv === el) {
      cv = null
      c = null
    }
  }
}

function loop() {
  if (!c || !cv) {
    raf = null
    return
  }
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, cv.width, cv.height)
  parts = parts.filter((p) => p.life > 0 && p.y < window.innerHeight + 60)
  for (const p of parts) {
    p.vy += 0.32
    p.vx *= 0.985
    p.vy *= 0.985
    p.x += p.vx
    p.y += p.vy
    p.r += p.vr
    p.f += 0.14
    p.life -= 0.0065
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.translate(p.x, p.y)
    c.rotate(p.r)
    c.scale(p.s * Math.cos(p.f), p.s)
    c.translate(-12, -12)
    c.globalAlpha = Math.max(0, Math.min(1, p.life * 2.2))
    c.fillStyle = p.col
    c.fill(p.p)
  }
  c.globalAlpha = 1
  raf = parts.length ? requestAnimationFrame(loop) : null
  if (!raf) {
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, cv.width, cv.height)
  }
}

function burst(x: number, y: number, n: number, o: BurstOpts = {}) {
  if (!cv || reduced() || !paths.length) return
  const { angle = -Math.PI / 2, spread = Math.PI * 2, power = 13, colors = COLS } = o
  for (let i = 0; i < n; i++) {
    const a = angle + (Math.random() - 0.5) * spread
    const v = power * (0.45 + Math.random() * 0.75)
    parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      r: Math.random() * 6.3,
      vr: (Math.random() - 0.5) * 0.3,
      s: 0.55 + Math.random() * 0.8,
      f: Math.random() * 6,
      p: paths[i % paths.length]!,
      col: colors[i % colors.length]!,
      life: 1,
    })
  }
  if (!raf) raf = requestAnimationFrame(loop)
}

export const FX = {
  burst,
  /** Burst from the centre of an element (the button you just pressed). */
  fromEl(el: Element | null | undefined, n = 24, o: BurstOpts = {}) {
    if (!el) return
    const b = el.getBoundingClientRect()
    burst(b.left + b.width / 2, b.top + b.height / 2, n, o)
  },
  /** The victory cannon: one burst up top, two from the bottom corners, a final pop. */
  celebrate() {
    const w = window.innerWidth
    const h = window.innerHeight
    burst(w / 2, h * 0.32, 90, { power: 15 })
    setTimeout(() => {
      burst(0, h, 60, { angle: -Math.PI / 3, spread: 0.8, power: 22 })
      burst(w, h, 60, { angle: (-Math.PI * 2) / 3, spread: 0.8, power: 22 })
    }, 350)
    setTimeout(() => burst(w / 2, h * 0.32, 60, { power: 12 }), 900)
  },
}

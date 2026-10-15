/**
 * Generates the PWA icons in apps/web/public from the app icon (docs/imports/tally-ho.png).
 * Run with `pnpm icons`.
 *
 *   icon-192/512        the icon, full bleed ("any")
 *   maskable-192/512    the icon at 80% centred on ink, inside the maskable safe zone
 *   apple-touch-icon    180, full bleed (iOS rounds the corners itself)
 *   favicon.svg         a simplified mark for tabs: the fox's face on the ink disc in a jade ring
 *   favicon.png         64, from the SVG
 *   favicon.ico         16 (a bolder cut: thicker ring, bigger fox, no crown) + 32/48, PNG-in-ICO
 *   splash-WxH.png      iOS launch screens: the icon on ink, one per iPhone (apps/web/app/splash.ts)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { SPLASH, splashFile } from '../apps/web/app/splash'

/** Run from the repo root (`pnpm icons`). */
const root = process.cwd()
const SRC = resolve(root, 'docs/imports/tally-ho.png')
const OUT = resolve(root, 'apps/web/public')
const INK = '#13112E'
/** The icon PNG's own background (one step off INK), so the splash has no seam. */
const ICON_BG = '#12112E'

const png = (size: number) =>
  sharp(SRC).resize(size, size, { fit: 'cover', kernel: 'lanczos3' }).png({ compressionLevel: 9 })

async function plain(name: string, size: number) {
  await png(size).toFile(resolve(OUT, name))
}

async function maskable(name: string, size: number) {
  const inner = Math.round(size * 0.8)
  const art = await png(inner).toBuffer()
  const off = Math.round((size - inner) / 2)
  await sharp({ create: { width: size, height: size, channels: 4, background: INK } })
    .composite([{ input: art, left: off, top: off }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT, name))
}

/**
 * The favicon: the icon pared down to what survives at 16px — the ink disc, the jade ring and
 * the fox's face (the mascot's own paths). The lettering, suits and pupils would turn to mush.
 */
const FOX_FACE = `
  <path d="M12 66 L25 14 L54 42 Z" fill="#FF6A1F"/><path d="M22 56 L28 27 L46 44 Z" fill="#F7E9D2"/>
  <path d="M108 66 L95 14 L66 42 Z" fill="#FF6A1F"/><path d="M98 56 L92 27 L74 44 Z" fill="#F7E9D2"/>
  <path d="M6 72 C12 47 35 37 60 37 C85 37 108 47 114 72 C101 76 93 83 86 92 L60 110 L34 92 C27 83 19 76 6 72 Z" fill="#FF6A1F"/>
  <path d="M6 72 C21 71 33 77 44 85 C50 81 55 79 60 79 C65 79 70 81 76 85 C87 77 99 71 114 72 C106 82 97 90 85 98 L60 112 L35 98 C23 90 14 82 6 72 Z" fill="#F7E9D2"/>
  <path d="M34 66 C38 56 49 55 54 64 C49 69 39 70 34 66 Z" fill="#13112E"/>
  <path d="M86 66 C82 56 71 55 66 64 C71 69 81 70 86 66 Z" fill="#13112E"/>
  <path d="M52 87 Q60 83 68 87 Q64 95 60 96 Q56 95 52 87 Z" fill="#13112E"/>`
const CROWN = `<path d="M41 33 L45 13 L53 24 L60 7 L67 24 L75 13 L79 33 Z" fill="#FFB800" stroke="#13112E" stroke-width="3" stroke-linejoin="round"/>`

function faviconSvg({ tiny = false } = {}): string {
  // Fox space is 120×120; the face spans y 14–112 (y 7 with the crown).
  const ring = tiny ? 6 : 4
  const scale = tiny ? 0.46 : 0.4
  const cy = tiny ? 63 : 59
  const fox = `<g transform="translate(32 ${tiny ? 33 : 34}) scale(${scale}) translate(-60 -${cy})">${FOX_FACE}${tiny ? '' : CROWN}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${32 - ring / 2}" fill="${INK}" stroke="#00D4AA" stroke-width="${ring}"/>${fox}</svg>`
}

const fav = (size: number) =>
  sharp(Buffer.from(faviconSvg({ tiny: size <= 16 })), { density: 72 * (size / 64) * 4 })
    .resize(size, size, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })

/** An ICO whose entries are PNGs (supported everywhere that matters since Vista). */
async function ico(name: string, sizes: number[]) {
  const images = await Promise.all(sizes.map((s) => fav(s).toBuffer()))
  const header = Buffer.alloc(6 + 16 * sizes.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)
  let offset = header.length
  sizes.forEach((s, i) => {
    const img = images[i]!
    const e = 6 + 16 * i
    header.writeUInt8(s >= 256 ? 0 : s, e)
    header.writeUInt8(s >= 256 ? 0 : s, e + 1)
    header.writeUInt8(0, e + 2)
    header.writeUInt8(0, e + 3)
    header.writeUInt16LE(1, e + 4)
    header.writeUInt16LE(32, e + 6)
    header.writeUInt32LE(img.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += img.length
  })
  await writeFile(resolve(OUT, name), Buffer.concat([header, ...images]))
}

/** The icon centred a little above the middle of an ink screen, like the app's first paint. */
async function splash(s: (typeof SPLASH)[number]) {
  const w = s.w * s.dpr
  const h = s.h * s.dpr
  const size = Math.round(w * 0.56)
  // Feather only the outermost edge of the square art, hiding the PNG's faint noise seam
  // without touching the lettering (which reaches into the corners).
  const pad = Math.round(size * 0.03)
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><defs><filter id="b"><feGaussianBlur stdDeviation="${pad / 2}"/></filter></defs><rect x="${pad}" y="${pad}" width="${size - 2 * pad}" height="${size - 2 * pad}" fill="#fff" filter="url(#b)"/></svg>`,
  )
  const art = await png(size)
    .composite([{ input: mask, blend: 'dest-in' }])
    .toBuffer()
  await sharp({ create: { width: w, height: h, channels: 4, background: ICON_BG } })
    .composite([
      { input: art, left: Math.round((w - size) / 2), top: Math.round(h * 0.42 - size / 2) },
    ])
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT, splashFile(s)))
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await Promise.all([
    plain('icon-192.png', 192),
    plain('icon-512.png', 512),
    maskable('maskable-192.png', 192),
    maskable('maskable-512.png', 512),
    plain('apple-touch-icon.png', 180),
    writeFile(resolve(OUT, 'favicon.svg'), `${faviconSvg()}\n`),
    fav(64).toFile(resolve(OUT, 'favicon.png')),
    ico('favicon.ico', [16, 32, 48]),
    ...SPLASH.map(splash),
  ])
  console.log(`icons → ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

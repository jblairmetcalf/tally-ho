/**
 * Screenshots of Storybook stories, for reviewing UI changes by eye (or by an agent that
 * Reads the PNGs). Serves the static Storybook build itself, on a free port, and always
 * stops it again.
 *
 * Usage (from the repo root, after `pnpm --filter @tally/storybook build`):
 *   node scripts/shoot.mjs [--out dir] [--width 390,320] [--theme both|dark|light] <story-id ...>
 *
 *   --out    where the PNGs go (default test-results/shots, which git ignores)
 *   --width  viewport widths in px, comma-separated (default 390,320: a phone and the smallest)
 *   --theme  both (default: one shot per theme), dark or light
 *
 * Story ids are the ones in the URL (?path=/story/<id>) and in storybook-static/index.json,
 * e.g. scoreboard-statlist--home. Files are <out>/<id>-<theme>-<width>.png.
 */
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const STATIC = resolve('apps/storybook/storybook-static')
const THEMES = ['dark', 'light']
const SETTLE_MS = 800

function fail(msg) {
  console.error(`shoot: ${msg}`)
  process.exit(1)
}

function parseArgs(argv) {
  const opts = { out: 'test-results/shots', widths: [390, 320], theme: 'both', ids: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const value = () => {
      const v = argv[++i]
      if (v == null) fail(`${a} needs a value`)
      return v
    }
    if (a === '--help' || a === '-h') {
      console.log(
        'usage: node scripts/shoot.mjs [--out dir] [--width 390,320] [--theme both|dark|light] <story-id ...>',
      )
      process.exit(0)
    } else if (a === '--out') opts.out = value()
    else if (a === '--width') {
      opts.widths = value()
        .split(',')
        .map((w) => Number(w.trim()))
      if (opts.widths.some((w) => !Number.isInteger(w) || w < 200 || w > 2000))
        fail('--width takes whole pixel widths between 200 and 2000, e.g. 390,320')
    } else if (a === '--theme') {
      opts.theme = value()
      if (!['both', ...THEMES].includes(opts.theme)) fail('--theme is both, dark or light')
    } else if (a.startsWith('--')) fail(`unknown option ${a}`)
    else opts.ids.push(a)
  }
  if (!opts.ids.length) fail('name at least one story id, e.g. scoreboard-statlist--home')
  return opts
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.map': 'application/json',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
}

async function isFile(p) {
  try {
    return (await stat(p)).isFile() ? p : null
  } catch {
    return null
  }
}

/** scripts/serve.mjs's static server, on a free port. Resolves to { server, port }. */
function serve(dir) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
    const base = join(dir, rel)
    const hit = (await isFile(base)) ?? (await isFile(join(base, 'index.html')))
    if (!hit) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not found')
      return
    }
    res.writeHead(200, { 'content-type': TYPES[extname(hit)] ?? 'application/octet-stream' })
    createReadStream(hit).pipe(res)
  })
  return new Promise((ok, ko) => {
    server.once('error', ko)
    server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port }))
  })
}

const opts = parseArgs(process.argv.slice(2))

const indexPath = join(STATIC, 'index.json')
if (!existsSync(indexPath))
  fail(`no Storybook build at ${STATIC}: run pnpm --filter @tally/storybook build first`)
const entries = JSON.parse(readFileSync(indexPath, 'utf8')).entries ?? {}
for (const id of opts.ids) {
  const e = entries[id]
  if (!e) {
    const near = Object.keys(entries)
      .filter((k) => k.startsWith(id.split('--')[0]))
      .slice(0, 8)
    fail(
      `"${id}" is not in storybook-static/index.json (rebuild Storybook if you just added it)` +
        (near.length ? `. Close: ${near.join(', ')}` : ''),
    )
  }
  if (e.type !== 'story') fail(`"${id}" is a ${e.type} page; shoot takes story ids`)
}

const themes = opts.theme === 'both' ? THEMES : [opts.theme]
const out = resolve(opts.out)
await mkdir(out, { recursive: true })

const { server, port } = await serve(STATIC)
let browser
let failed = false
try {
  browser = await chromium.launch()
  for (const width of opts.widths) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    for (const id of opts.ids) {
      for (const theme of themes) {
        errors.length = 0
        await page.goto(
          `http://127.0.0.1:${port}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story&globals=theme:${theme}`,
        )
        await page.locator('#storybook-root > *').first().waitFor({ state: 'attached' })
        await page.waitForTimeout(SETTLE_MS)
        const file = join(out, `${id}-${theme}-${width}.png`)
        await page.screenshot({ path: file, fullPage: true })
        console.log(file)
        if (errors.length) {
          failed = true
          console.error(`  page errors in ${id} (${theme}, ${width}px): ${errors.join(' | ')}`)
        }
      }
    }
    await context.close()
  }
} catch (err) {
  failed = true
  console.error(`shoot: ${err instanceof Error ? err.message : err}`)
} finally {
  await browser?.close()
  server.closeAllConnections()
  await new Promise((done) => server.close(done))
}
if (failed) process.exit(1)

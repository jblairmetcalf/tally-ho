/**
 * A tiny static server for the exported app (apps/web/out), for e2e runs.
 * Usage: node scripts/serve.mjs [dir] [port]
 */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const dir = resolve(process.argv[2] ?? 'apps/web/out')
const port = Number(process.argv[3] ?? 3100)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.map': 'application/json',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
}

async function file(p) {
  try {
    const s = await stat(p)
    return s.isFile() ? p : null
  } catch {
    return null
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  const base = join(dir, rel)
  const hit =
    (await file(base)) ?? (await file(join(base, 'index.html'))) ?? (await file(`${base}.html`))
  if (!hit) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    createReadStream(join(dir, '404.html'))
      .on('error', () => res.end('Not found'))
      .pipe(res)
    return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(hit)] ?? 'application/octet-stream' })
  createReadStream(hit).pipe(res)
}).listen(port, () => console.log(`serving ${dir} on http://localhost:${port}`))

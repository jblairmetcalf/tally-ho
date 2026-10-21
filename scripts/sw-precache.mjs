/**
 * Post-build step for the static export: rewrites out/sw.js so the service worker precaches
 * the app shell and every file the first paint needs, and versions its caches by build.
 * Usage: node scripts/sw-precache.mjs [outDir]
 */
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'

const out = resolve(process.argv[2] ?? 'apps/web/out')

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])),
  )
  return files.flat()
}

const urlOf = (file) => `/${relative(out, file).split(sep).join('/')}`

const files = await walk(join(out, '_next', 'static'))

/**
 * The Firebase SDK chunks are only for signed-in family members, who load them on their first
 * (online) sign-in; from then on the worker's cache-first rule keeps them for offline. Leaving
 * them out of the install-time precache keeps them off every portfolio visitor's phone.
 */
const FIREBASE = /firestore\.googleapis\.com|identitytoolkit\.googleapis\.com/
const familyOnly = new Set()
for (const f of files)
  if (f.endsWith('.js') && FIREBASE.test(await readFile(f, 'utf8'))) familyOnly.add(f)

const statics = files.filter((f) => !familyOnly.has(f)).map(urlOf)
const extras = [
  '/manifest.webmanifest',
  '/icon-192.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/favicon.svg',
  // The launch screen's art: offline launches show it too.
  '/splash-art.webp',
]
const precache = ['/', ...extras, ...statics].sort()

const hash = createHash('sha256')
hash.update(await readFile(join(out, 'index.html')))
// Every chunk (Firebase ones too) versions the caches, so an SDK update clears the old copy.
for (const f of files) hash.update(urlOf(f))
const version = hash.digest('hex').slice(0, 10)

const swPath = join(out, 'sw.js')
const sw = await readFile(swPath, 'utf8')
const next = sw
  .replace(/const VERSION = '[^']*'/, `const VERSION = '${version}'`)
  .replace(/const PRECACHE = \[\]/, `const PRECACHE = ${JSON.stringify(precache)}`)
if (next === sw) throw new Error('sw-precache: placeholders not found in out/sw.js')
await writeFile(swPath, next)
console.log(
  `sw-precache: ${precache.length} files, version ${version}` +
    (familyOnly.size ? ` (${familyOnly.size} Firebase chunks cached on first sign-in)` : ''),
)

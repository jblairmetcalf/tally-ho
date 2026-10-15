/*
 * Tally Ho! — service worker.
 *
 *   · static assets and fonts: cache-first (Next's /_next/static files are content-hashed,
 *     so a cached copy can never be the wrong one)
 *   · page navigations: network-first; the last good copy is kept as the offline fallback,
 *     and when there is none, a small themed "the fox is napping" page is served
 *
 * Scores never touch the network: they live in localStorage on the phone.
 * Bump VERSION to drop every old cache on the next activation.
 */
// Both are rewritten at build time by scripts/sw-precache.mjs: VERSION becomes a hash of the
// build, PRECACHE the app shell and every content-hashed file it needs to start offline.
const VERSION = 'dev'
const PRECACHE = []
const STATIC = `tally-static-${VERSION}`
const PAGES = `tally-pages-${VERSION}`
const KEEP = [STATIC, PAGES]

const FOX = `<svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
  <path d="M12 66 L25 14 L54 42 Z" fill="#FF6A1F"/><path d="M22 56 L28 27 L46 44 Z" fill="#F7E9D2"/>
  <path d="M108 66 L95 14 L66 42 Z" fill="#FF6A1F"/><path d="M98 56 L92 27 L74 44 Z" fill="#F7E9D2"/>
  <path d="M6 72 C12 47 35 37 60 37 C85 37 108 47 114 72 C101 76 93 83 86 92 L60 110 L34 92 C27 83 19 76 6 72 Z" fill="#FF6A1F"/>
  <path d="M6 72 C21 71 33 77 44 85 C50 81 55 79 60 79 C65 79 70 81 76 85 C87 77 99 71 114 72 C106 82 97 90 85 98 L60 112 L35 98 C23 90 14 82 6 72 Z" fill="#F7E9D2"/>
  <path d="M60 37 L52 50 L60 60 L68 50 Z" fill="#E85A12" opacity=".7"/>
  <path d="M34 64 Q44 70 54 64" fill="none" stroke="#13112E" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M86 64 Q76 70 66 64" fill="none" stroke="#13112E" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M52 87 Q60 83 68 87 Q64 95 60 96 Q56 95 52 87 Z" fill="#13112E"/>
  <path d="M48 100 Q54 105 60 99 Q66 105 74 98" fill="none" stroke="#13112E" stroke-width="2.8" stroke-linecap="round"/>
  <text x="92" y="30" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#A78BFA">z</text>
  <text x="102" y="16" font-family="system-ui, sans-serif" font-weight="900" font-size="12" fill="#A78BFA">z</text>
</svg>`

function offlinePage() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#13112E">
<title>Tally Ho! — offline</title>
<style>
  html, body { height: 100%; margin: 0; }
  body { display: grid; place-items: center; background: #13112E; color: #F5F2FF; padding: 24px;
    box-sizing: border-box; font: 700 16px/1.45 "Nunito", ui-rounded, "SF Pro Rounded", system-ui, -apple-system, sans-serif;
    background-image: radial-gradient(120% 60% at 50% -12%, rgb(0 212 170 / 0.16), transparent 62%); }
  main { max-width: 340px; text-align: center; background: #24204D; border: 1.5px solid #3E3878;
    border-radius: 16px; box-shadow: 0 6px 0 rgb(0 0 0 / 0.35); padding: 24px 22px 26px; }
  svg { display: block; margin: 0 auto 8px; }
  h1 { font: 400 32px/1.05 "Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif; margin: 0 0 8px;
    color: #FFB800; text-shadow: 0 3px 0 rgb(0 0 0 / 0.35); }
  p { margin: 0 0 20px; color: #A29BD0; }
  button { font: 900 17px/1 inherit; font-family: inherit; min-height: 48px; padding: 12px 26px; border: 0;
    border-radius: 14px; background: #00D4AA; color: #13112E; box-shadow: 0 5px 0 #00977A; cursor: pointer; }
  button:active { transform: translateY(4px); box-shadow: 0 1px 0 #00977A; }
  button:focus-visible { outline: 3px solid #FFB800; outline-offset: 3px; }
</style>
</head>
<body>
<main>
  ${FOX}
  <h1>The fox is napping.</h1>
  <p>Tally Ho! can't reach the internet right now. Your scores are safe on this phone.</p>
  <button type="button" onclick="location.reload()">Try again</button>
</main>
</body>
</html>`
  return new Response(html, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })
}

self.addEventListener('install', (event) => {
  // Safe to take over at once: navigations are network-first and static files are
  // content-hashed, so a new worker never hands an old page the wrong bundle.
  // Precache the whole app on install, so it opens offline the very first time — not only
  // after a second online visit.
  event.waitUntil(
    (async () => {
      const shell = await caches.open(PAGES)
      const files = await caches.open(STATIC)
      await Promise.all(
        PRECACHE.map(async (path) => {
          try {
            const res = await fetch(path, { cache: 'reload' })
            if (!cacheable(res)) return
            await (path === '/' ? shell : files).put(path, res)
          } catch {
            /* one missing file must not block install */
          }
        }),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((n) => n.startsWith('tally-') && !KEEP.includes(n)).map((n) => caches.delete(n)),
      )
      await self.clients.claim()
    })(),
  )
})

const STATIC_FILE = /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|ico|webp|avif|webmanifest)$/i
const isStatic = (url) =>
  url.pathname.startsWith('/_next/static/') || STATIC_FILE.test(url.pathname)

/** Only whole, same-origin, successful answers are worth keeping. */
const cacheable = (res) =>
  res?.ok &&
  res.type === 'basic' &&
  !res.redirected &&
  !/no-store/i.test(res.headers.get('cache-control') || '')

async function cacheFirst(request) {
  const cache = await caches.open(STATIC)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (cacheable(res)) cache.put(request, res.clone()).catch(() => {})
  return res
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES)
  try {
    const res = await fetch(request)
    if (cacheable(res)) cache.put(request, res.clone()).catch(() => {})
    return res
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match(new URL('/', self.location.origin).href)) ||
      offlinePage()
    )
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/_next/webpack-hmr') || url.pathname.startsWith('/__nextjs')) return
  if (url.pathname === '/sw.js') return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }
  if (isStatic(url)) event.respondWith(cacheFirst(request))
})

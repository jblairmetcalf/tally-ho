/**
 * Generates the link preview (Open Graph / Twitter card) shown when someone shares the app's URL
 * in a text message, Slack, WhatsApp…: apps/web/public/og.jpg, 1200×630 (JPEG: WhatsApp skips previews over ~300 KB).
 *
 * Usage (from the repo root, online: the brand fonts come from Google Fonts): `pnpm og`
 *
 * Drawn as HTML in Playwright's Chromium so it uses the app's real type (Lilita One, Nunito), the
 * app icon (docs/imports/tally-ho.png), the confetti suits and the player palette. The words on
 * the card and in the meta tags (apps/web/app/layout.tsx) should agree.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { PLAYER_COLORS } from '../packages/ui/src/brand/palette'
import { SUITS, type Suit } from '../packages/ui/src/feel/suits'

const root = process.cwd()
const OUT = resolve(root, 'apps/web/public/og.jpg')

const W = 1200
const H = 630
const [JADE, AMBER, FOX, LAV, CORAL, SKY, CREAM] = PLAYER_COLORS

/** Confetti, placed by hand so it frames the card and never sits on the words. */
const CONFETTI: [Suit, number, number, number, number, string][] = [
  // suit, x, y, size, rotation, colour
  ['heart', 34, 40, 34, -18, CORAL],
  ['diamond', 120, 560, 30, 12, AMBER],
  ['club', 470, 34, 26, 20, LAV],
  ['spade', 440, 548, 36, -14, JADE],
  ['diamond', 1010, 170, 26, -8, SKY],
  ['heart', 1128, 38, 30, 16, AMBER],
  ['spade', 1150, 300, 26, -22, LAV],
  ['club', 1110, 560, 34, 10, FOX],
  ['diamond', 30, 330, 22, 30, JADE],
  ['heart', 960, 262, 24, -6, CREAM],
]

const suit = ([s, x, y, size, rot, color]: (typeof CONFETTI)[number]) =>
  `<svg viewBox="0 0 24 24" style="position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;transform:rotate(${rot}deg);filter:drop-shadow(0 3px 0 rgb(0 0 0 / .35))"><path d="${SUITS[s]}" fill="${color}"/></svg>`

const page = (icon: string) => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@800;900&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; background: #13112E; font-family: Nunito, sans-serif; color: #F5F2FF; }
  .card { position: relative; width: ${W}px; height: ${H}px; overflow: hidden;
    background:
      radial-gradient(circle at 254px 315px, rgb(0 212 170 / .22), transparent 340px),
      radial-gradient(circle at 980px 120px, rgb(255 184 0 / .16), transparent 360px),
      radial-gradient(circle at 900px 620px, rgb(167 139 250 / .14), transparent 320px),
      #13112E; }
  .rays { position: absolute; left: 254px; top: 315px; width: 1300px; height: 1300px; margin: -650px 0 0 -650px;
    border-radius: 50%; background: repeating-conic-gradient(rgb(255 184 0 / .12) 0 9deg, transparent 9deg 18deg);
    -webkit-mask-image: radial-gradient(circle, #000 22%, transparent 58%); }
  .badge { position: absolute; left: 24px; top: 85px; width: 460px; height: 460px; border-radius: 50%;
    background: url(data:image/png;base64,${icon}) center/cover; transform: rotate(-5deg);
    box-shadow: 0 12px 0 rgb(0 0 0 / .35), 0 0 0 8px rgb(0 212 170 / .18), 0 30px 80px rgb(0 0 0 / .5); }
  .copy { position: absolute; left: 512px; right: 34px; top: 0; bottom: 0; display: flex; flex-direction: column;
    justify-content: center; align-items: flex-start; gap: 26px; }
  h1 { font-family: 'Lilita One', sans-serif; font-weight: 400; font-size: 100px; line-height: .9; letter-spacing: .005em; white-space: nowrap; }
  h1 .a { color: #F5F2FF; text-shadow: 0 5px 0 rgb(0 0 0 / .4); }
  h1 .b { color: ${AMBER}; text-shadow: 0 6px 0 #C9480A, 0 0 50px rgb(255 184 0 / .45); }
  .sub { font-weight: 900; font-size: 39px; line-height: 1.2; color: #CFC9F2; }
  .cta { display: flex; flex-direction: column; align-items: flex-start; gap: 30px; margin-top: 4px; }
  .go { font-family: 'Lilita One'; font-size: 54px; color: #13112E; background: ${JADE}; border-radius: 22px;
    padding: 14px 44px 18px; box-shadow: 0 7px 0 #00977A, 0 0 40px rgb(0 212 170 / .3); }
  .free { font-weight: 900; font-size: 31px; color: #A29BD0; line-height: 1.2; }
</style></head>
<body><div class="card">
  <div class="rays"></div>
  ${CONFETTI.map(suit).join('')}
  <div class="badge"></div>
  <div class="copy">
    <h1><span class="a">Who’s winning</span><br><span class="b">tonight?</span></h1>
    <p class="sub">Tap in scores, hear the fanfare,<br>crown the champion.</p>
    <div class="cta"><span class="go">Deal me in!</span><span class="free">Free. Works offline. No sign-up.</span></div>
  </div>
</div></body></html>`

async function main() {
  const icon = (await readFile(resolve(root, 'docs/imports/tally-ho.png'))).toString('base64')
  const browser = await chromium.launch()
  try {
    const tab = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
    await tab.setContent(page(icon), { waitUntil: 'networkidle' })
    await tab.evaluate(() => document.fonts.ready)
    // "Who's winning" stays on one line and fills the column exactly, whatever the font's metrics.
    await tab.evaluate(() => {
      const h1 = document.querySelector('h1') as HTMLElement
      const line = h1.querySelector('.a') as HTMLElement
      const column = (h1.parentElement as HTMLElement).clientWidth
      const size = Number.parseFloat(getComputedStyle(h1).fontSize)
      h1.style.fontSize = `${Math.floor((size * column) / line.getBoundingClientRect().width)}px`
    })
    const lilita = await tab.evaluate(() => document.fonts.check("40px 'Lilita One'"))
    if (!lilita) throw new Error('Lilita One did not load: run `pnpm og` online.')
    await tab.screenshot({ path: OUT, type: 'jpeg', quality: 90 })
    console.log(`og: wrote ${OUT}`)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

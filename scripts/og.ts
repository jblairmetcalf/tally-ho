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
  ['diamond', 640, 22, 22, -8, SKY],
  ['heart', 1128, 38, 30, 16, AMBER],
  ['spade', 1150, 300, 26, -22, LAV],
  ['club', 1110, 560, 34, 10, FOX],
  ['diamond', 30, 330, 22, 30, JADE],
  ['heart', 770, 584, 22, -6, CREAM],
]

const suit = ([s, x, y, size, rot, color]: (typeof CONFETTI)[number]) =>
  `<svg viewBox="0 0 24 24" style="position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;transform:rotate(${rot}deg);filter:drop-shadow(0 3px 0 rgb(0 0 0 / .35))"><path d="${SUITS[s]}" fill="${color}"/></svg>`

/** A player in the mini scoreboard: chip (crowned if leading), name, total. */
const player = (initial: string, name: string, total: number, color: string, lead = false) => `
  <div class="p${lead ? ' lead' : ''}">
    <span class="chip" style="background:${color}">${initial}${
      lead
        ? `<svg class="crown" viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="${AMBER}" stroke="#13112E" stroke-width="1.6" stroke-linejoin="round"/></svg>`
        : ''
    }</span>
    <span class="nm">${name}</span>
    <span class="tot">${total}</span>
  </div>`

const page = (icon: string) => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@800;900&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; background: #13112E; font-family: Nunito, sans-serif; color: #F5F2FF; }
  .card { position: relative; width: ${W}px; height: ${H}px; overflow: hidden;
    background:
      radial-gradient(circle at 250px 320px, rgb(0 212 170 / .22), transparent 330px),
      radial-gradient(circle at 980px 120px, rgb(255 184 0 / .16), transparent 360px),
      radial-gradient(circle at 900px 620px, rgb(167 139 250 / .14), transparent 320px),
      #13112E; }
  .rays { position: absolute; left: 250px; top: 318px; width: 1300px; height: 1300px; margin: -650px 0 0 -650px;
    border-radius: 50%; background: repeating-conic-gradient(rgb(255 184 0 / .12) 0 9deg, transparent 9deg 18deg);
    -webkit-mask-image: radial-gradient(circle, #000 22%, transparent 58%); }
  .badge { position: absolute; left: 40px; top: 108px; width: 420px; height: 420px; border-radius: 50%;
    background: url(data:image/png;base64,${icon}) center/cover; transform: rotate(-5deg);
    box-shadow: 0 12px 0 rgb(0 0 0 / .35), 0 0 0 8px rgb(0 212 170 / .18), 0 30px 80px rgb(0 0 0 / .5); }
  .copy { position: absolute; left: 520px; right: 64px; top: 64px; display: flex; flex-direction: column; gap: 22px; }
  .eyebrow { align-self: flex-start; font-weight: 900; font-size: 20px; letter-spacing: .14em; text-transform: uppercase;
    color: ${JADE}; background: rgb(0 212 170 / .12); border: 2px solid rgb(0 212 170 / .5); border-radius: 999px; padding: 7px 18px; }
  h1 { font-family: 'Lilita One', sans-serif; font-weight: 400; font-size: 92px; line-height: .92; letter-spacing: .005em; }
  h1 .a { color: #F5F2FF; text-shadow: 0 5px 0 rgb(0 0 0 / .4); }
  h1 .b { color: ${AMBER}; text-shadow: 0 6px 0 #C9480A, 0 0 50px rgb(255 184 0 / .45); }
  .sub { font-weight: 900; font-size: 29px; line-height: 1.25; color: #CFC9F2; }
  .board { display: flex; gap: 12px; }
  .p { display: flex; align-items: center; gap: 10px; background: #24204D; border: 2px solid #3E3878; border-radius: 18px;
    padding: 10px 16px 10px 10px; box-shadow: 0 5px 0 rgb(0 0 0 / .3); }
  .p.lead { border-color: ${AMBER}; background: #2F2A60; box-shadow: 0 5px 0 #C98F00, 0 0 34px rgb(255 184 0 / .25); }
  .chip { position: relative; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center;
    font-family: 'Lilita One'; font-size: 22px; color: #13112E; box-shadow: inset 0 -3px 0 rgb(0 0 0 / .2); }
  .crown { position: absolute; top: -24px; left: 50%; width: 30px; margin-left: -15px; transform: rotate(-12deg);
    filter: drop-shadow(0 2px 0 rgb(0 0 0 / .4)); }
  .nm { font-weight: 900; font-size: 22px; color: #F5F2FF; }
  .tot { font-family: 'Lilita One'; font-size: 30px; color: #F5F2FF; margin-left: 4px; }
  .p.lead .tot { color: ${AMBER}; }
  .cta { display: flex; align-items: center; gap: 18px; }
  .go { font-family: 'Lilita One'; font-size: 34px; color: #13112E; background: ${JADE}; border-radius: 18px;
    padding: 12px 28px 14px; box-shadow: 0 6px 0 #00977A; }
  .free { font-weight: 900; font-size: 21px; color: #A29BD0; line-height: 1.3; }
</style></head>
<body><div class="card">
  <div class="rays"></div>
  ${CONFETTI.map(suit).join('')}
  <div class="badge"></div>
  <div class="copy">
    <span class="eyebrow">Game night scorekeeper</span>
    <h1><span class="a">Who’s winning</span><br><span class="b">tonight?</span></h1>
    <p class="sub">Tap in scores, hear the fanfare,<br>crown the champion.</p>
    <div class="board">
      ${player('K', 'Kate', 184, JADE, true)}
      ${player('A', 'Alder', 171, FOX)}
      ${player('B', 'Blair', 162, LAV)}
    </div>
    <div class="cta"><span class="go">Deal me in!</span><span class="free">Free. Works offline.<br>No sign-up.</span></div>
  </div>
</div></body></html>`

async function main() {
  const icon = (await readFile(resolve(root, 'docs/imports/tally-ho.png'))).toString('base64')
  const browser = await chromium.launch()
  try {
    const tab = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
    await tab.setContent(page(icon), { waitUntil: 'networkidle' })
    await tab.evaluate(() => document.fonts.ready)
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

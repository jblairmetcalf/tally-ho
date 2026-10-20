import { expect, test } from '@playwright/test'
import { household, KEY, seed, startPreset } from './helpers'

test('opens offline after a single online visit (the shell is precached on install)', async ({
  page,
  context,
}) => {
  await seed(page, household())
  await page.goto('/')
  await expect(page.getByRole('img', { name: 'Tally Ho!' })).toBeVisible()

  // Wait for the worker to finish installing (precache) and take control.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r))
    return reg.active?.state
  })
  const cached = await page.evaluate(async () => {
    const names = await caches.keys()
    let n = 0
    for (const name of names) n += (await (await caches.open(name)).keys()).length
    return n
  })
  expect(cached).toBeGreaterThan(5)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('img', { name: 'Tally Ho!' })).toBeVisible()
  await expect(page.getByText('No games yet')).toBeVisible()
  await context.setOffline(false)
})

test('data saved by the prototype (tallyho.v2) is migrated on first launch', async ({ page }) => {
  const v2 = {
    games: [
      {
        id: 'g1',
        name: 'Cribbage',
        goal: 'score',
        target: 121,
        players: ['Nana', 'Mary Jo'],
        rounds: [{ scores: { Nana: 70, 'Mary Jo': 60 } }, { scores: { Nana: 55, 'Mary Jo': 40 } }],
        startedAt: '2026-09-01T18:00:00.000Z',
        completedAt: '2026-09-01T19:00:00.000Z',
        winner: 'Nana',
      },
    ],
    active: null,
    colors: { Nana: 4, 'Mary Jo': 5 },
    lastPlayers: ['Nana', 'Mary Jo'],
    muted: true,
    hasSamples: false,
  }
  await page.addInitScript((json) => {
    if (!localStorage.getItem('tallyho.v3')) localStorage.setItem('tallyho.v2', json)
  }, JSON.stringify(v2))
  await page.goto('/')
  await expect(page.getByText('Family champion')).toBeVisible()
  await expect(page.getByText('Nana').first()).toBeVisible()
  await expect(page.getByText('Cribbage').first()).toBeVisible()

  // The upgraded copy is saved under the new key, scores keyed by player id.
  await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), KEY)).toContain('"mary-jo"')
})

test('a Daylight phone paints Daylight before the app loads (no dark flash)', async ({ page }) => {
  await seed(page, household({ theme: 'light' }))
  // Block the app's JavaScript: only the inline boot script can set the theme.
  await page.route('**/_next/static/chunks/**', (r) => r.abort())
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgb(255, 244, 226)')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#FFF4E2')
})

test('a system-dark phone with no saved prefs paints dark', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' })
  const page = await context.newPage()
  await page.route('**/_next/static/chunks/**', (r) => r.abort())
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await context.close()
})

test('feels native: nothing selects or calls out, but score fields still edit', async ({
  page,
}) => {
  await seed(page, household())
  await page.goto('/')
  const style = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((el) => {
        const cs = getComputedStyle(el)
        return {
          select: cs.userSelect || cs.getPropertyValue('-webkit-user-select'),
          callout: cs.getPropertyValue('-webkit-touch-callout'),
          touch: cs.touchAction,
        }
      })
  for (const sel of ['button', 'h2', '.wordmark']) {
    expect((await style(sel)).select, sel).toBe('none')
  }
  expect((await style('body')).select).toBe('none')

  await startPreset(page, 'Flip 7')
  const input = page.getByRole('textbox', { name: /Kate score/ })
  expect((await style('.score-in')).select).not.toBe('none')
  expect((await style('.btn')).touch).toBe('manipulation')
  await input.fill('42')
  await input.selectText()
  expect(
    await page.evaluate(() => {
      const el = document.activeElement as HTMLInputElement
      return el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0)
    }),
  ).toBe('42')
})

test('sound: plays on tap, the toggle silences it, and it comes back after leaving the app', async ({
  page,
}) => {
  // Count contexts and notes the synth creates (the sound itself can't be heard in a test).
  await page.addInitScript(() => {
    const Real = window.AudioContext
    const log = { contexts: [] as AudioContext[], notes: 0 }
    ;(window as unknown as { __audio: typeof log }).__audio = log
    window.AudioContext = class extends Real {
      constructor(...args: ConstructorParameters<typeof Real>) {
        super(...args)
        log.contexts.push(this)
        const make = this.createOscillator.bind(this)
        this.createOscillator = () => {
          log.notes++
          return make()
        }
      }
    }
  })
  await seed(page, household({ muted: false }))
  await page.goto('/')
  const audio = () =>
    page.evaluate(() => {
      const a = (window as unknown as { __audio: { contexts: AudioContext[]; notes: number } })
        .__audio
      const last = a.contexts.at(-1)
      return { contexts: a.contexts.length, notes: a.notes, state: last?.state ?? 'none' }
    })
  const history = page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'History' })
  const home = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Home' })

  // A tap makes a running context and plays.
  await history.click()
  await expect.poll(async () => (await audio()).state).toBe('running')
  const first = await audio()
  expect(first.notes).toBeGreaterThan(0)

  // The sound toggle: muted means no notes and the audio is released.
  await home.click()
  await page.getByRole('button', { name: 'Turn sound off' }).click()
  await expect.poll(async () => (await audio()).state).toBe('closed')
  const muted = await audio()
  await history.click()
  await home.click()
  expect((await audio()).notes).toBe(muted.notes)

  // Unmute: the confirming chirp plays on a fresh context.
  await page.getByRole('button', { name: 'Turn sound on' }).click()
  await expect.poll(async () => (await audio()).state).toBe('running')
  expect((await audio()).notes).toBeGreaterThan(muted.notes)

  // Leave the app (hidden): audio released. First tap back: a fresh context plays.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(async () => (await audio()).state).toBe('closed')
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const away = await audio()
  await history.click()
  await expect.poll(async () => (await audio()).state).toBe('running')
  const back = await audio()
  expect(back.contexts).toBeGreaterThan(away.contexts)
  expect(back.notes).toBeGreaterThan(away.notes)

  // Sheets slide up with one whoosh; New game opens to its own tune (two voices and a sparkle).
  await home.click()
  const beforeSettings = (await audio()).notes
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect.poll(async () => (await audio()).notes).toBe(beforeSettings + 1)
  await page
    .getByRole('dialog', { name: 'Settings' })
    .getByRole('button', { name: 'Close' })
    .click()
  await expect(page.getByRole('dialog')).toBeHidden()
  const beforeDeal = (await audio()).notes
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'New game' })
    .click()
  await expect(page.getByRole('dialog', { name: 'New game' })).toBeVisible()
  await expect.poll(async () => (await audio()).notes - beforeDeal).toBeGreaterThanOrEqual(10)
})

test('a shared link unfurls: absolute Open Graph and Twitter card tags, and the image is served', async ({
  page,
  request,
}) => {
  await seed(page, household())
  await page.goto('/')
  const meta = (sel: string) => page.locator(`meta[${sel}]`).getAttribute('content')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    /Who.s winning tonight/,
  )
  expect(await meta('property="og:description"')).toMatch(/Free, works offline/)
  expect(await meta('name="twitter:card"')).toBe('summary_large_image')
  const image = await meta('property="og:image"')
  // iMessage, Slack and WhatsApp ignore a relative image: it must be absolute, on the real site.
  expect(image).toMatch(/^https:\/\/.+\/og\.jpg$/)
  expect(await meta('property="og:image:width"')).toBe('1200')
  const res = await request.get('/og.jpg')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/jpeg')
  expect((await res.body()).length).toBeLessThan(300_000)
})

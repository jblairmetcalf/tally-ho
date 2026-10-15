import { expect, test } from '@playwright/test'
import { household, KEY, seed } from './helpers'

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

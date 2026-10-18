import { expect, test } from '@playwright/test'
import { household, KEY, seed, toast } from './helpers'

const settings = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  const sheet = page.getByRole('dialog', { name: 'Settings' })
  await expect(sheet).toBeVisible()
  return sheet
}

test('the install guide pops up once on a first visit, and never again once dismissed', async ({
  page,
}) => {
  // A first visit: nothing saved (sound off so no AudioContext surprises).
  await seed(page, household({ installHintSeen: false }))
  await page.goto('/')
  const guide = page.getByRole('dialog', { name: 'Add to Home Screen' })
  // It waits a moment after the app paints.
  await expect(page.getByRole('img', { name: 'Tally Ho!' })).toBeVisible()
  await expect(guide).toBeVisible()
  // The test phone is an iPhone (Safari): the Share steps.
  await expect(guide.getByRole('list', { name: 'How to add it' })).toContainText(
    'Add to Home Screen',
  )
  await guide.getByRole('button', { name: 'Got it' }).click()
  await expect(guide).toBeHidden()
  await expect
    .poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}').prefs, KEY))
    .toMatchObject({ installHintSeen: true })

  await page.reload()
  await expect(page.getByRole('img', { name: 'Tally Ho!' })).toBeVisible()
  // Longer than the pop-up's delay: it stays away.
  await page.waitForTimeout(2000)
  await expect(guide).toBeHidden()
})

test('Escape dismisses the pop-up for good too', async ({ page }) => {
  await seed(page, household({ installHintSeen: false }))
  await page.goto('/')
  const guide = page.getByRole('dialog', { name: 'Add to Home Screen' })
  await expect(guide).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(guide).toBeHidden()
  await expect
    .poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}').prefs, KEY))
    .toMatchObject({ installHintSeen: true })
})

test('Settings: install, share with a QR code, and say hi to the maker', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await seed(page, household())
  await page.goto('/')
  const sheet = await settings(page)
  const url = `${new URL(baseURL ?? '').origin}/`

  // Install: the same guide, over Settings; Escape closes only it.
  await sheet.getByRole('button', { name: /^Install on your phone/ }).click()
  const guide = page.getByRole('dialog', { name: 'Add to Home Screen' })
  await expect(guide.getByRole('list', { name: 'How to add it' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(guide).toBeHidden()
  await expect(sheet).toBeVisible()

  // Share: a QR code of this address, the address, and Copy link.
  await sheet.getByRole('button', { name: /^Share Tally Ho!/ }).click()
  const share = page.getByRole('dialog', { name: 'Share Tally Ho!' })
  const qr = share.getByRole('img', { name: `QR code to open ${url}` })
  await expect(qr).toBeVisible()
  await expect(qr).toHaveJSProperty('tagName', 'svg')
  await expect(share.getByText(url, { exact: true })).toBeVisible()
  await share.getByRole('button', { name: 'Copy link' }).click()
  await expect(toast(page)).toHaveText('Link copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url)
  await share.getByRole('button', { name: 'Close' }).click()
  await expect(share).toBeHidden()

  // The maker: a link to his site, in a new tab.
  await sheet.getByRole('button', { name: /^Say hi to the maker/ }).click()
  const hi = page.getByRole('dialog', { name: 'Say hi' })
  const link = hi.getByRole('link', { name: 'Visit jblairmetcalf.com' })
  await expect(link).toHaveAttribute('href', 'https://jblairmetcalf.com')
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
})

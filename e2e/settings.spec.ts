import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { seed, withSamples } from './helpers'

test('renaming a player in settings shows in history', async ({ page }) => {
  await seed(page, withSamples())
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  const sheet = page.getByRole('dialog', { name: 'Settings' })
  await sheet.getByRole('button', { name: 'Edit Kate' }).click()
  // The editor opens as its own sheet over Settings; its title follows the new name.
  const editor = page.getByRole('dialog', { name: /^Edit Kat/ })
  const input = editor.getByLabel("Kate's name")
  await input.fill('Katherine')
  await input.press('Enter')
  await expect(editor.locator('h3')).toHaveText('Edit Katherine')
  await editor.getByRole('button', { name: 'Close' }).click()
  await expect(editor).toBeHidden()
  await expect(sheet.locator('.player-line', { hasText: 'Katherine' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(sheet).toBeHidden()

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'History' })
    .click()
  await expect(page.getByRole('heading', { name: 'The record' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Katherine/ }).first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/\bKate\b/)
})

for (const theme of ['dark', 'light'] as const) {
  test(`home has no serious accessibility violations (${theme})`, async ({ page }) => {
    await seed(page, withSamples({ theme }))
    await page.goto('/')
    await expect(page.locator(`[data-theme="${theme}"].tally`)).toBeVisible()
    await expect(page.getByText('Family champion')).toBeVisible()
    // Let the staggered entrances finish so contrast is measured at rest.
    await page.waitForTimeout(1500)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual(
      [],
    )
  })
}

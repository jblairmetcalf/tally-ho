import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Every story and Docs page opens inside the real Storybook UI (the manager) without errors.
 * The story suite checks the preview alone; this catches what only breaks around it, like a
 * control that can't show a story's args and takes the whole UI down.
 */
interface Entry {
  id: string
  title: string
  name: string
  type: 'story' | 'docs'
}
const index = JSON.parse(
  readFileSync(resolve('apps/storybook/storybook-static/index.json'), 'utf8'),
) as { entries: Record<string, Entry> }

// The full manager UI is much heavier than a story's iframe; with every worker loading one at
// once (the whole e2e run in parallel), 30s was too tight and a few loads timed out.
test.describe.configure({ timeout: 90_000 })

for (const e of Object.values(index.entries)) {
  test(`manager › ${e.title} › ${e.name}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (m) => {
      // The manager logs a benign channel notice when Playwright drives it; ignore that one.
      if (m.type() === 'error' && !/channel message/.test(m.text())) errors.push(m.text())
    })
    await page.goto(`/?path=/${e.type}/${e.id}`)
    await expect(page.locator('#storybook-preview-iframe')).toBeVisible()
    await page.waitForTimeout(800)
    expect(errors, 'errors in the Storybook UI').toEqual([])
  })
}

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Every story renders without errors and has no serious/critical accessibility violations,
 * in both themes. Default stories show Dark + Daylight side by side, so one load covers both;
 * overlays and full-screen stories are loaded once per theme.
 */
interface Entry {
  id: string
  title: string
  name: string
  type: string
  tags?: string[]
}
const index = JSON.parse(
  readFileSync(resolve('apps/storybook/storybook-static/index.json'), 'utf8'),
) as { entries: Record<string, Entry> }
const stories = Object.values(index.entries).filter((e) => e.type === 'story')

/** Foundations pages deliberately show low-contrast pairs as data (that's the point). */
const showsContrastAsData = (e: Entry) => e.title === 'Foundations/Colour'

// Two themes plus axe per story, with every worker doing the same at once: under machine load
// a few stories brushed the 30s default. Give them room rather than retrying flakes.
test.describe.configure({ timeout: 60_000 })

for (const story of stories) {
  for (const theme of ['both', 'light'] as const) {
    test(`${story.title} › ${story.name} (${theme})`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`)
      await page.locator('#storybook-root > *').first().waitFor({ state: 'attached' })
      // Let entrance animations settle so contrast is measured on the final frame.
      await page.waitForTimeout(400)
      expect(errors, 'page errors').toEqual([])

      let axe = new AxeBuilder({ page })
        .include('#storybook-root')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      if (showsContrastAsData(story)) axe = axe.disableRules(['color-contrast'])
      const { violations } = await axe.analyze()
      const bad = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
      expect(bad, 'serious/critical axe violations').toEqual([])
    })
  }
}

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { household, openNewGame, seed, withSamples } from './helpers'

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
    // The champion card reads "Family champion" or "Dead heat" depending on the sample results;
    // the Standings heading is there either way.
    await expect(page.getByRole('heading', { name: 'Standings' })).toBeVisible()
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

test('Add player is disabled until a name is typed (New game and Settings)', async ({ page }) => {
  await seed(page, household())
  await page.goto('/')

  await openNewGame(page)
  const deal = page.getByRole('dialog', { name: 'New game' })
  const add = deal.getByRole('button', { name: 'Add', exact: true })
  const field = deal.getByLabel('Add a player')
  await expect(add).toBeDisabled()
  await field.fill('   ')
  await expect(add).toBeDisabled()
  await field.fill('Nana')
  await expect(add).toBeEnabled()
  await add.click()
  await expect(field).toHaveValue('')
  await expect(add).toBeDisabled()
  await deal.getByRole('button', { name: 'Close' }).click()
  await expect(deal).toBeHidden()

  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  const addInSettings = settings.getByRole('button', { name: 'Add', exact: true })
  await expect(addInSettings).toBeDisabled()
  await settings.getByLabel('Add a player').fill('Pip')
  await expect(addInSettings).toBeEnabled()
})

test('adding a game in Settings saves nothing until it has a name; New game never lists a name twice', async ({
  page,
}) => {
  const s = household()
  // Two presets left with the same name (what older builds made).
  s.presets.push(
    { id: 'new-game', name: 'New game', goal: 'score', target: 100, lowWins: false },
    { id: 'new-game-2', name: 'New game', goal: 'score', target: 100, lowWins: false },
  )
  await seed(page, s)
  await page.goto('/')

  await openNewGame(page)
  const deal = page.getByRole('dialog', { name: 'New game' })
  await expect(deal.getByRole('button', { name: 'New game', exact: true })).toHaveCount(1)
  await deal.getByRole('button', { name: 'Close' }).click()
  await expect(deal).toBeHidden()

  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  const rows = settings.getByRole('button', { name: /^Edit / })
  const before = await rows.count()

  // Opened and closed without a name: no new row.
  await settings.getByRole('button', { name: 'Add a game' }).click()
  const add = page.getByRole('dialog', { name: 'Add a game' })
  await expect(add.getByRole('button', { name: 'Add game' })).toBeDisabled()
  await add.getByRole('button', { name: 'Close' }).click()
  await expect(add).toBeHidden()
  await expect(rows).toHaveCount(before)

  // A name the family already has can't be added.
  await settings.getByRole('button', { name: 'Add a game' }).click()
  await add.getByLabel('Game name').fill('flip 7')
  await expect(add.getByText('You already have flip 7.')).toBeVisible()
  await expect(add.getByRole('button', { name: 'Add game' })).toBeDisabled()

  // A new name, a goal, then Add: one row, with that goal.
  await add.getByLabel('Game name').fill('Codenames')
  await add.getByRole('radio', { name: 'Who won?' }).click()
  await add.getByRole('button', { name: 'Add game' }).click()
  await expect(add).toBeHidden()
  await expect(rows).toHaveCount(before + 1)
  await expect(settings.getByRole('button', { name: 'Edit Codenames' })).toBeVisible()
  await expect(settings.locator('.player-line', { hasText: 'Codenames' })).toContainText('Who won?')
})

test('History with no games offers + New game, which opens the New game sheet', async ({
  page,
}) => {
  await seed(page, household())
  await page.goto('/')
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'History' })
    .click()
  await expect(page.getByRole('heading', { name: 'The record' })).toBeVisible()
  await page.getByRole('main').getByRole('button', { name: 'New game' }).click()
  await expect(page.getByRole('dialog', { name: 'New game' })).toBeVisible()
})

test('a "Who won?" game in Settings: wins needed, no low-wins, never a blank target', async ({
  page,
}) => {
  await seed(page, household())
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await expect(settings.locator('.player-line', { hasText: 'Uno' })).toContainText('Who won?')
  await expect(settings.locator('.player-line', { hasText: 'Scout' })).toContainText(
    'One round per player',
  )
  await settings.getByRole('button', { name: 'Edit Uno' }).click()
  const editor = page.getByRole('dialog', { name: 'Edit Uno' })
  await expect(editor.getByRole('radio', { name: 'Who won?' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  const wins = editor.getByLabel('Wins needed')
  await expect(wins).toHaveValue('1')
  await expect(editor.getByRole('switch', { name: 'Lowest score wins' })).toBeHidden()

  await wins.fill('3')
  // Cleared, away and back: it comes back as 1, never empty.
  await wins.fill('')
  await editor.getByRole('radio', { name: 'Score' }).click()
  await expect(editor.getByLabel('Points to win')).toHaveValue('200')
  await editor.getByRole('radio', { name: 'Who won?' }).click()
  await expect(editor.getByLabel('Wins needed')).toHaveValue('1')
  await editor.getByRole('button', { name: 'Close' }).click()
  await expect(editor).toBeHidden()
  await expect(settings.locator('.player-line', { hasText: 'Uno' })).toContainText('Who won?')
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { household, openNewGame, openSettingsArea, seed, withSamples } from './helpers'

test('renaming a player in settings shows in history', async ({ page }) => {
  await seed(page, withSamples())
  await page.goto('/')
  const { settings, sheet } = await openSettingsArea(page, 'Players')
  await sheet.getByRole('button', { name: 'Edit Kate' }).click()
  // The editor is a page pushed over Players; its title (and the dialog's name) follows the name.
  const editor = page.getByRole('dialog', { name: /^Edit Kat/ })
  const input = editor.getByLabel("Kate's name")
  await input.fill('Katherine')
  await input.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Edit Katherine' })).toBeVisible()
  await editor.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(sheet.locator('.player-line', { hasText: 'Katherine' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(sheet).toBeHidden()
  // The Players row's hint follows the line-up.
  await expect(settings.getByRole('button', { name: /^Players/ })).toContainText('Katherine')
  await settings.getByRole('button', { name: 'Close' }).click()
  await expect(settings).toBeHidden()

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

  const { sheet: players } = await openSettingsArea(page, 'Players')
  const addInSettings = players.getByRole('button', { name: 'Add', exact: true })
  await expect(addInSettings).toBeDisabled()
  await players.getByLabel('Add a player').fill('Pip')
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

  const { settings, sheet: games } = await openSettingsArea(page, 'Games')
  const rows = games.getByRole('button', { name: /^Edit / })
  const before = await rows.count()

  // Opened and backed out of without a name: no new row.
  await games.getByRole('button', { name: 'Add a game' }).click()
  const add = page.getByRole('dialog', { name: 'Add a game' })
  await expect(add.getByRole('button', { name: 'Add game' })).toBeDisabled()
  await add.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(add).toBeHidden()
  await expect(rows).toHaveCount(before)

  // A name the family already has can't be added.
  await games.getByRole('button', { name: 'Add a game' }).click()
  await add.getByLabel('Game name').fill('flip 7')
  await expect(add.getByText('You already have flip 7.')).toBeVisible()
  await expect(add.getByRole('button', { name: 'Add game' })).toBeDisabled()

  // A new name, a goal, then Add: back on Games, one more row, with that goal.
  await add.getByLabel('Game name').fill('Codenames')
  await add.getByRole('radio', { name: 'Who won?' }).click()
  await add.getByRole('button', { name: 'Add game' }).click()
  await expect(add).toBeHidden()
  await expect(games).toBeVisible()
  await expect(rows).toHaveCount(before + 1)
  await expect(games.getByRole('button', { name: 'Edit Codenames' })).toBeVisible()
  await expect(games.locator('.player-line', { hasText: 'Codenames' })).toContainText('Who won?')
  // The header stays put however far the list scrolls: back and close are always in reach.
  await games.getByRole('button', { name: 'Add a game' }).scrollIntoViewIfNeeded()
  await expect(games.getByRole('button', { name: 'Back', exact: true })).toBeInViewport()
  await expect(games.getByRole('button', { name: 'Close' })).toBeInViewport()
  // Back on the landing (pages beneath are hidden from assistive tech while one is over them),
  // the Games row counts the new one.
  await games.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(games).toBeHidden()
  await expect(settings.getByRole('button', { name: /^Games/ })).toContainText(
    `${before + 1} games`,
  )
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
  const { sheet: settings } = await openSettingsArea(page, 'Games')
  await expect(settings.locator('.player-line', { hasText: 'Uno' })).toContainText('Who won?')
  await expect(settings.locator('.player-line', { hasText: 'Round Robin' })).toContainText(
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
  await editor.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(settings.locator('.player-line', { hasText: 'Uno' })).toContainText('Who won?')
})

test('Settings pages push inside one sheet: back top left, close top right, named by the page', async ({
  page,
}) => {
  // It walks several pages deep and back with a slide each way: ~17s on a quiet machine, so
  // the 30s default is too tight when every worker runs at once. More time, same assertions.
  test.slow()
  await seed(page, household())
  await page.goto('/')
  const { settings, sheet: players } = await openSettingsArea(page, 'Players')
  const dialog = page.getByRole('dialog')
  const row = settings.getByRole('button', { name: /^Players/ })
  // One dialog the whole way down, its name the page on top.
  await expect(dialog).toHaveCount(1)
  await expect(dialog).toHaveAccessibleName('Players')
  await players.getByRole('button', { name: 'Edit Kate' }).click()
  const editor = page.getByRole('dialog', { name: 'Edit Kate' })
  await expect(editor.getByLabel("Kate's name")).toBeVisible()
  await expect(dialog).toHaveCount(1)
  await expect(dialog).toHaveAccessibleName('Edit Kate')
  await expect(editor.getByRole('button', { name: 'Back', exact: true })).toBeVisible()
  await expect(editor.getByRole('button', { name: 'Close' })).toBeVisible()

  // Back returns to Players, focus on the row that pushed the editor.
  await editor.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(players).toBeVisible()
  await expect(dialog).toHaveAccessibleName('Players')
  await expect(players.getByRole('button', { name: 'Edit Kate' })).toBeFocused()

  // Escape goes back one page at a time, then closes at the root.
  await players.getByRole('button', { name: 'Edit Kate' }).click()
  await expect(editor).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(players).toBeVisible()
  await expect(players.getByRole('button', { name: 'Edit Kate' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(settings).toBeVisible()
  await expect(settings.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0)
  await expect(settings.getByRole('button', { name: 'Close' })).toBeVisible()
  await expect(row).toBeFocused()

  // Appearance: the theme, and the row's summary follows it.
  await settings.getByRole('button', { name: /^Appearance/ }).click()
  const look = page.getByRole('dialog', { name: 'Appearance' })
  await look.getByRole('radio', { name: 'Light' }).click()
  await expect(page.locator('[data-theme="light"].tally')).toBeVisible()
  await expect(look.getByRole('switch', { name: 'Sound' })).not.toBeChecked()
  await look.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(look).toBeHidden()
  await expect(settings.getByRole('button', { name: /^Appearance/ })).toContainText(
    'Light · Sound off',
  )
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  // Close from three deep closes everything in one tap.
  await openSettingsArea(page, 'Players')
  await players.getByRole('button', { name: 'Edit Blair' }).click()
  const blair = page.getByRole('dialog', { name: 'Edit Blair' })
  await expect(blair).toBeVisible()
  await blair.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused()
})

test('archiving a player or deleting a game goes back to the list', async ({ page }) => {
  await seed(page, household())
  await page.goto('/')
  const { settings, sheet: players } = await openSettingsArea(page, 'Players')
  await players.getByRole('button', { name: 'Edit Alder' }).click()
  const editor = page.getByRole('dialog', { name: 'Edit Alder' })
  await editor.getByRole('button', { name: 'Archive player' }).click()
  await editor.getByRole('button', { name: 'Tap again to archive' }).click()
  await expect(editor).toBeHidden()
  await expect(players).toBeVisible()
  await expect(players.getByRole('button', { name: 'Edit Alder' })).toHaveCount(0)
  await expect(players.getByRole('button', { name: 'Bring back Alder' })).toBeVisible()

  await players.getByRole('button', { name: 'Back', exact: true }).click()
  await settings.getByRole('button', { name: /^Games/ }).click()
  const games = page.getByRole('dialog', { name: 'Games' })
  await games.getByRole('button', { name: 'Edit Hearts' }).click()
  const hearts = page.getByRole('dialog', { name: 'Edit Hearts' })
  await hearts.getByRole('button', { name: 'Delete game' }).click()
  await hearts.getByRole('button', { name: 'Tap again to delete' }).click()
  await expect(hearts).toBeHidden()
  await expect(games).toBeVisible()
  await expect(games.getByRole('button', { name: 'Edit Hearts' })).toHaveCount(0)
})

test("Restore default games: built-in games back to how they ship, the family's own stay", async ({
  page,
}) => {
  // A record seeded before Monopoly Deal became "Who won?", with Spicy deleted.
  const s = household()
  s.presets = s.presets
    .filter((p) => p.id !== 'spicy')
    .map((p) => (p.id === 'monopoly-deal' ? { ...p, goal: 'open' as const, target: null } : p))
  await seed(page, s)
  await page.goto('/')
  const { sheet: games } = await openSettingsArea(page, 'Games')
  await expect(games.locator('.player-line', { hasText: 'Monopoly Deal' })).toContainText(
    'Open-ended',
  )
  await expect(games.locator('.player-line', { hasText: 'Spicy' })).toHaveCount(0)

  const restore = games.getByRole('button', { name: 'Restore default games' })
  await restore.click()
  await games.getByRole('button', { name: 'Tap again to restore' }).click()
  await expect(page.getByText('Default games restored')).toBeVisible()
  await expect(games.locator('.player-line', { hasText: 'Monopoly Deal' })).toContainText(
    'Who won?',
  )
  await expect(games.locator('.player-line', { hasText: 'Spicy' })).toContainText('Who won?')
  await expect(games.locator('.player-line', { hasText: 'Round Robin' })).toHaveCount(1)
})

test("a game's player count shows and edits in Settings › Games, and New game follows it", async ({
  page,
}) => {
  await seed(page, household())
  await page.goto('/')
  const { sheet: games } = await openSettingsArea(page, 'Games')
  const line = (name: string) => games.locator('.player-line', { hasText: name })
  await expect(line('The Fox in the Forest')).toContainText('Who won? · 2 players')
  await expect(line('High Society')).toContainText('Who won? · 3+ players')
  await expect(line('Flip 7')).not.toContainText('players')

  // The Fox: two only, by default. Clear Most: no limit any more.
  await games.getByRole('button', { name: 'Edit The Fox in the Forest' }).click()
  const editor = page.getByRole('dialog', { name: 'Edit The Fox in the Forest' })
  await expect(editor.getByLabel('Fewest players')).toHaveValue('2')
  const most = editor.getByLabel('Most players')
  await expect(most).toHaveValue('2')
  await most.fill('')
  await most.press('Enter')
  // Most can't go below Fewest: 1 settles at 2... and 99 at 12.
  await editor.getByLabel('Fewest players').fill('1')
  await editor.getByLabel('Fewest players').press('Enter')
  await expect(editor.getByLabel('Fewest players')).toHaveValue('2')
  await editor.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(line('The Fox in the Forest')).not.toContainText('players')

  // New game deals the Fox to all three now.
  await games.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await openNewGame(page)
  const sheet = page.getByRole('dialog', { name: 'New game' })
  await sheet.getByRole('button', { name: 'The Fox in the Forest', exact: true }).click()
  await expect(sheet.getByRole('button', { name: 'Deal in · The Fox in the Forest' })).toBeEnabled()
})

test('Add a game takes a player count too', async ({ page }) => {
  await seed(page, household())
  await page.goto('/')
  const { sheet: games } = await openSettingsArea(page, 'Games')
  await games.getByRole('button', { name: 'Add a game' }).click()
  const add = page.getByRole('dialog', { name: 'Add a game' })
  await add.getByLabel('Game name').fill('Codenames')
  await add.getByLabel('Fewest players').fill('4')
  await add.getByLabel('Most players').fill('3') // below Fewest: settles at 4
  await add.getByLabel('Most players').press('Enter')
  await expect(add.getByLabel('Most players')).toHaveValue('4')
  await add.getByRole('button', { name: 'Add game' }).click()
  await expect(games.locator('.player-line', { hasText: 'Codenames' })).toContainText('4 players')
})

test('changing the theme reveals the next one from the tapped button (instantly under reduced motion)', async ({
  page,
}) => {
  await seed(page, household({ theme: 'dark' }))
  await page.goto('/')
  const { sheet } = await openSettingsArea(page, 'Appearance')
  const html = page.locator('html')

  // Motion on: a view transition grows the new theme as a circle from the tap, then tidies up.
  await sheet.getByRole('radio', { name: 'Light' }).click()
  await expect(html).toHaveClass(/theme-reveal/)
  await expect(html).toHaveAttribute('data-theme', 'light')
  await expect(html).not.toHaveClass(/theme-reveal/)
  const x = await html.evaluate((el) => el.style.getPropertyValue('--reveal-x'))
  expect(Number.parseFloat(x)).toBeGreaterThan(0)

  // Quick taps while the reveal is still growing land on the page root (the transition's
  // overlay), which the sheet must not take for a tap outside: it stays open.
  await sheet.getByRole('radio', { name: 'Dark' }).click()
  await page.mouse.click(200, 300)
  await page.mouse.click(60, 700)
  await expect(html).not.toHaveClass(/theme-reveal/)
  await expect(page.getByRole('dialog', { name: 'Appearance' })).toBeVisible()
  await sheet.getByRole('radio', { name: 'Light' }).click()
  await expect(html).toHaveAttribute('data-theme', 'light')

  // Reduced motion: no reveal, just the switch.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await sheet.getByRole('radio', { name: 'Dark' }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(html).not.toHaveClass(/theme-reveal/)
})

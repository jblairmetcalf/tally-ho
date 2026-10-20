import { expect, test } from '@playwright/test'
import {
  card,
  gameSheet,
  household,
  scoreRound,
  seed,
  startPreset,
  toast,
  victory,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await seed(page, household())
  await page.goto('/')
})

test('new game → rounds → lead change → finish → victory → rematch', async ({ page }) => {
  await startPreset(page, 'Flip 7')
  await expect(page.getByRole('dialog').getByText('Round 1 · Race to 200')).toBeVisible()

  await scoreRound(page, { Kate: 50, Blair: 10, Alder: 0 })
  await expect(page.getByRole('dialog').getByText('Round 2 · Race to 200')).toBeVisible()
  await expect(card(page, 'Kate')).toContainText('150 to go')

  await scoreRound(page, { Kate: 0, Blair: 60, Alder: 5 })
  await expect(toast(page)).toHaveText('Blair takes the lead')

  await scoreRound(page, { Kate: 0, Blair: 150, Alder: 0 })
  await expect(victory(page)).toBeVisible()
  await expect(victory(page)).toContainText('Blair')
  await expect(victory(page)).toContainText('Flip 7')

  await victory(page).getByRole('button', { name: 'Rematch' }).click()
  await expect(victory(page)).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'Flip 7' })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('Round 1 · Race to 200')).toBeVisible()
  await expect(card(page, 'Blair')).toContainText('200 to go')
})

test('edit and delete a round', async ({ page }) => {
  await startPreset(page, 'Flip 7')
  await scoreRound(page, { Kate: 10, Blair: 20, Alder: 30 })
  await scoreRound(page, { Kate: 5, Blair: 5, Alder: 5 })
  await expect(card(page, 'Kate')).toContainText('15')

  await page.getByRole('button', { name: 'Edit round 1' }).click()
  const sheet = page.getByRole('dialog', { name: 'Edit round 1' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('textbox', { name: 'Kate score' }).fill('99')
  await sheet.getByRole('button', { name: 'Save round 1' }).click()
  await expect(sheet).toBeHidden()
  await expect(toast(page)).toHaveText('Round 1 saved')
  await expect(card(page, 'Kate')).toContainText('104')

  await page.getByRole('button', { name: 'Edit round 2' }).click()
  const sheet2 = page.getByRole('dialog', { name: 'Edit round 2' })
  await sheet2.getByRole('button', { name: 'Delete round 2' }).click()
  await sheet2.getByRole('button', { name: 'Tap again to delete' }).click()
  await expect(sheet2).toBeHidden()
  await expect(toast(page)).toHaveText('Round 2 deleted')
  await expect(card(page, 'Kate')).toContainText('99')
  await expect(page.getByRole('dialog').getByText('Round 2 · Race to 200')).toBeVisible()
})

test('open-ended game ends with the flag and crowns the leader', async ({ page }) => {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'New game' })
    .click()
  const sheet = page.getByRole('dialog', { name: 'New game' })
  await sheet.getByRole('button', { name: 'Other' }).click()
  await sheet.getByLabel('Game name').fill('Pictionary')
  await expect(sheet.getByRole('radio', { name: 'Open' })).toHaveAttribute('aria-checked', 'true')
  await sheet.getByRole('button', { name: 'Deal in · Pictionary' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('dialog').getByText('Round 1 · Open-ended')).toBeVisible()

  await scoreRound(page, { Kate: 3, Blair: 7, Alder: 1 })
  await page.getByRole('button', { name: 'End game' }).click()
  const end = page.getByRole('dialog', { name: 'End Pictionary?' })
  await expect(end).toContainText('Blair leads with 7')
  await end.getByRole('button', { name: 'End and crown Blair' }).click()

  await expect(victory(page)).toBeVisible()
  await expect(victory(page)).toContainText('Blair')
  await victory(page).getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Family champion')).toBeVisible()
  await expect(page.locator('.champ')).toContainText('Blair')
})

test('a tie at the end calls a tiebreak round', async ({ page }) => {
  await startPreset(page, 'Sushi Go')
  await scoreRound(page, { Kate: 10, Blair: 10, Alder: 5 })
  await scoreRound(page, { Kate: 10, Blair: 10, Alder: 5 })
  await expect(page.locator('.ribbon')).toHaveText('Final round!')
  await scoreRound(page, { Kate: 10, Blair: 10, Alder: 5 })
  await expect(toast(page)).toHaveText('Tied at the top. Crown the winner, or play one more round.')
  await expect(page.locator('.ribbon')).toHaveText('Tiebreak!')
  await expect(victory(page)).toBeHidden()

  await scoreRound(page, { Kate: 1, Blair: 0, Alder: 0 })
  await expect(victory(page)).toBeVisible()
  await expect(victory(page)).toContainText('Kate')
})

test('Hearts: lowest score wins, danger near the bust line', async ({ page }) => {
  await startPreset(page, 'Hearts')
  await expect(page.getByRole('dialog').getByText('Round 1 · Bust at 100')).toBeVisible()

  await scoreRound(page, { Kate: 90, Blair: 10, Alder: 20 })
  await expect(toast(page)).toHaveText('Kate is in danger')
  await expect(card(page, 'Kate')).toContainText('Danger')
  await expect(card(page, 'Kate')).toContainText('10 until bust')
  // Blair has the lowest total, so Blair leads.
  await expect(card(page, 'Blair').locator('.crown')).toBeVisible()

  await scoreRound(page, { Kate: 15, Blair: 5, Alder: 5 })
  await expect(victory(page)).toBeVisible()
  await expect(victory(page)).toContainText('Blair')
})

test('the game is a sheet over Home: close it and the game stays live; Resume and the fox bring it back', async ({
  page,
}) => {
  await startPreset(page, 'Flip 7') // New game slides away, then the game rises in its sheet
  const game = gameSheet(page, 'Flip 7')
  await scoreRound(page, { Kate: 10, Blair: 5, Alder: 0 })

  await game.getByRole('button', { name: 'Close' }).click()
  await expect(game).toBeHidden()
  // Home, with the game waiting on the resume card.
  const resume = page.getByRole('button', { name: /Flip 7.*Round 2 · Race to 200/ })
  await expect(resume).toBeVisible()
  await resume.click()
  await expect(game).toBeVisible()
  await expect(card(page, 'Kate')).toContainText('10')

  // Escape at the scoreboard puts it away too; the nav fox reopens it.
  await page.keyboard.press('Escape')
  await expect(game).toBeHidden()
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'Back to the game' })
    .click()
  await expect(game).toBeVisible()

  // Edit round is a page inside the game's sheet: back returns to the scoreboard.
  await game.getByRole('button', { name: 'Edit round 1' }).click()
  await expect(page.getByRole('dialog', { name: 'Edit round 1' })).toBeVisible()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(game).toBeVisible()
})

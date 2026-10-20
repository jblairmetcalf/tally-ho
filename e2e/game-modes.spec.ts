import { expect, type Page, test } from '@playwright/test'
import { card, household, openNewGame, scoreRound, seed, startPreset, victory } from './helpers'

/** The ways a game can end beyond a score race: "Who won?", a round each, final scores, ties. */

test.beforeEach(async ({ page }) => {
  await seed(page, household())
  await page.goto('/')
})

const picker = (page: Page, title: string | RegExp) =>
  page.getByRole('dialog').getByRole('group', { name: title })

test('Uno is "Who won?": one tap on the winner ends it', async ({ page }) => {
  await startPreset(page, 'Uno')
  await expect(page.getByRole('dialog').getByText('Round 1 · Who won?')).toBeVisible()
  // No score fields, no race track: just the players.
  await expect(page.getByLabel('Kate score')).toHaveCount(0)
  await picker(page, 'Who won?').getByRole('button', { name: 'Alder' }).click()
  await expect(victory(page)).toBeVisible()
  await expect(victory(page)).toContainText('Alder')
  await expect(victory(page)).toContainText('wins Uno')
  await expect(victory(page)).not.toContainText('with 1')
})

test('Jaipur, two players: first to two wins, rounds can be re-picked', async ({ page }) => {
  await openNewGame(page)
  const sheet = page.getByRole('dialog', { name: 'New game' })
  await sheet.getByRole('button', { name: 'Jaipur', exact: true }).click()
  await expect(sheet.getByRole('radio', { name: 'Who won?' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(sheet.getByLabel('Wins needed')).toHaveValue('2')
  await expect(sheet.getByRole('switch', { name: 'Lowest score wins' })).toBeHidden()
  await sheet
    .getByRole('group', { name: 'Who is playing' })
    .getByRole('button', { name: 'Alder' })
    .click()
  await sheet.getByRole('button', { name: 'Deal in · Jaipur' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('dialog').getByText('Round 1 · First to 2 wins')).toBeVisible()
  await expect(card(page, 'Kate')).toContainText('2 to win')

  await picker(page, 'Who won round 1?').getByRole('button', { name: 'Kate' }).click()
  await expect(card(page, 'Kate')).toContainText('1 to win')
  // Round 1 was Blair's really: fix it in the log.
  await page.getByRole('button', { name: 'Edit round 1' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit round 1' })
  await edit.getByRole('button', { name: 'Blair' }).click()
  await expect(edit.getByRole('button', { name: 'Blair' })).toHaveAttribute('aria-pressed', 'true')
  await edit.getByRole('button', { name: 'Save round 1' }).click()
  await expect(edit).toBeHidden()
  await expect(page.getByRole('button', { name: 'Edit round 1' })).toHaveAccessibleDescription(
    'Blair won round 1',
  )
  await expect(card(page, 'Blair')).toContainText('1 to win')
  await expect(card(page, 'Kate')).toContainText('2 to win')

  await picker(page, 'Who won round 2?').getByRole('button', { name: 'Kate' }).click()
  await expect(victory(page)).toBeHidden()
  await picker(page, 'Who won round 3?').getByRole('button', { name: 'Kate' }).click()
  await expect(victory(page)).toBeVisible()
  await expect(victory(page)).toContainText('Kate')
  await expect(victory(page)).toContainText('wins Jaipur, 2–1')
})

test('a one-round-per-player game deals a round per player, following the line-up', async ({
  page,
}) => {
  await openNewGame(page)
  const sheet = page.getByRole('dialog', { name: 'New game' })
  await sheet.getByRole('button', { name: 'Round Robin', exact: true }).click()
  await expect(sheet.getByRole('switch', { name: 'One round per player' })).toBeChecked()
  const rounds = sheet.getByLabel('Number of rounds')
  await expect(rounds).toHaveValue('3')
  await sheet
    .getByRole('group', { name: 'Who is playing' })
    .getByRole('button', { name: 'Alder' })
    .click()
  await expect(rounds).toHaveValue('2')
  await sheet.getByRole('button', { name: 'Deal in · Round Robin' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('dialog').getByText('Round 1 · 2 rounds')).toBeVisible()

  await scoreRound(page, { Kate: 5, Blair: 3 })
  await expect(victory(page)).toBeHidden()
  await scoreRound(page, { Kate: 1, Blair: 6 })
  await expect(victory(page)).toBeVisible()
  await expect(victory(page)).toContainText('Blair')
})

test('Push is one final tally', async ({ page }) => {
  await startPreset(page, 'Push')
  await expect(page.getByRole('dialog').getByText('Round 1 · Final scores')).toBeVisible()
  await scoreRound(page, { Kate: 12, Blair: 30, Alder: 18 })
  await expect(victory(page)).toBeVisible()
  await expect(victory(page)).toContainText('Blair')
})

test('a tie at the end can be settled by crowning a leader', async ({ page }) => {
  await openNewGame(page)
  const sheet = page.getByRole('dialog', { name: 'New game' })
  await sheet.getByRole('button', { name: 'Sushi Go', exact: true }).click()
  await sheet.getByLabel('Number of rounds').fill('1')
  await sheet.getByRole('button', { name: 'Deal in · Sushi Go' }).click()
  await expect(sheet).toBeHidden()

  await scoreRound(page, { Kate: 10, Blair: 10, Alder: 5 })
  await expect(victory(page)).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Tied at the top' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crown Alder' })).toHaveCount(0)
  // The tiebreak round stays on offer underneath.
  await expect(page.getByRole('button', { name: 'Score round 2' })).toBeVisible()
  await page.getByRole('button', { name: 'Crown Blair' }).click()
  await expect(victory(page)).toBeVisible()
  await expect(victory(page)).toContainText('Blair')
})

test('the End game sheet crowns from a tie too', async ({ page }) => {
  await openNewGame(page)
  const sheet = page.getByRole('dialog', { name: 'New game' })
  await sheet.getByRole('button', { name: 'Other' }).click()
  await sheet.getByLabel('Game name').fill('Dominoes')
  await sheet.getByRole('button', { name: 'Deal in · Dominoes' }).click()
  await expect(sheet).toBeHidden()
  await scoreRound(page, { Kate: 4, Blair: 4, Alder: 1 })
  await page.getByRole('button', { name: 'End game' }).click()
  const end = page.getByRole('dialog', { name: 'End Dominoes?' })
  await expect(end).toContainText('Kate and Blair are tied at 4')
  await end.getByRole('button', { name: 'Crown Kate' }).click()
  await expect(victory(page)).toBeVisible()
  await expect(victory(page)).toContainText('Kate')
})

test.describe('at 320 wide', () => {
  test.use({ viewport: { width: 320, height: 640 } })

  test('"How does it end?" keeps the sheet one height for every goal', async ({ page }) => {
    await openNewGame(page)
    const sheet = page.getByRole('dialog', { name: 'New game' })
    const height = () => sheet.evaluate((el) => el.scrollHeight)
    const before = await height()
    await sheet.getByRole('button', { name: 'Round Robin', exact: true }).click()
    expect(await height()).toBe(before)
    for (const goal of ['Score', 'Rounds', 'Who won?', 'Open']) {
      const radio = sheet.getByRole('radio', { name: goal })
      await radio.click()
      await expect(radio).toHaveAttribute('aria-checked', 'true')
      // Every label fits on one line: the segments stay one row tall.
      expect((await radio.boundingBox())?.height).toBeLessThan(48)
      expect(await height()).toBe(before)
    }
    await sheet.getByRole('radio', { name: 'Rounds' }).click()
    await sheet.getByRole('switch', { name: 'One round per player' }).click()
    expect(await height()).toBe(before)
  })
})

test('Deal in stays disabled, saying why, until the game can be dealt', async ({ page }) => {
  await openNewGame(page)
  const sheet = page.getByRole('dialog', { name: 'New game' })
  const who = sheet.getByRole('group', { name: 'Who is playing' })
  const deal = (game?: string) =>
    sheet.getByRole('button', { name: game ? `Deal in · ${game}` : /^(Deal in|Start)/ })

  // Nothing picked yet.
  await expect(deal()).toBeDisabled()
  await expect(deal()).toHaveAccessibleDescription('Pick a game to start.')

  // The Fox in the Forest is for two: with all three in, it says so and won't deal.
  await sheet.getByRole('button', { name: 'The Fox in the Forest', exact: true }).click()
  await expect(sheet.getByText(/^2 players only\./)).toBeVisible()
  await expect(deal('The Fox in the Forest')).toBeDisabled()
  await expect(deal('The Fox in the Forest')).toHaveAccessibleDescription(
    'The Fox in the Forest is for exactly 2 players.',
  )

  // High Society needs three: drop to two and it won't deal either.
  await sheet.getByRole('button', { name: 'High Society', exact: true }).click()
  await expect(sheet.getByText(/^3 or more players\./)).toBeVisible()
  await who.getByRole('button', { name: 'Alder' }).click()
  await expect(deal('High Society')).toHaveAccessibleDescription(
    'High Society needs at least 3 players.',
  )
  await expect(deal('High Society')).toBeDisabled()

  // Too few players for anything, then a target cleared: still disabled, each with its reason.
  await who.getByRole('button', { name: 'Blair' }).click()
  await sheet.getByRole('button', { name: 'Flip 7', exact: true }).click()
  await expect(deal('Flip 7')).toHaveAccessibleDescription('Add at least two players.')
  await who.getByRole('button', { name: 'Blair' }).click()
  await expect(deal('Flip 7')).toBeEnabled()
  await sheet.getByLabel('Points to win').fill('')
  await expect(deal('Flip 7')).toBeDisabled()
  await expect(deal('Flip 7')).toHaveAccessibleDescription(
    'Set a score target, or choose open-ended.',
  )
  await sheet.getByLabel('Points to win').fill('200')

  // Two players fit the Fox: it deals.
  await sheet.getByRole('button', { name: 'The Fox in the Forest', exact: true }).click()
  await expect(deal('The Fox in the Forest')).toBeEnabled()
  await deal('The Fox in the Forest').click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'The Fox in the Forest' })).toBeVisible()
})

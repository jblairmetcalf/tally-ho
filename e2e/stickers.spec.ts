import { expect, test } from '@playwright/test'
import { gameSheet, household, seed, startPreset, victory, withSamples } from './helpers'

/** The Sticker Club: Standings tallies, the sticker book, fresh stickers, the victory pack, game details. */

test("Standings show each player's sticker tally, and a row opens their sticker book", async ({
  page,
}) => {
  await seed(page, withSamples())
  await page.goto('/')
  const standings = page.locator('.card', { has: page.getByRole('heading', { name: 'Standings' }) })
  await expect(standings.getByText(/^\d+ stickers? · \d+ to go$/)).toHaveCount(3)

  await expect(standings.getByText('Tap a name for their stickers')).toBeVisible()
  // Each row keeps its place and wins for screen readers, then says what it opens.
  const kate = standings.getByRole('button', {
    name: /^Kate, \d(st|nd|rd|th) with \d+ wins?: \d+ of 12 stickers\. Open sticker book$/,
  })
  const n = Number((await kate.getAttribute('aria-label'))?.match(/: (\d+) of 12/)?.[1])
  await kate.click()
  const book = page.getByRole('dialog', { name: 'Sticker book' })
  await expect(book.getByRole('heading', { name: "Kate's stickers" })).toBeVisible()
  await expect(book.getByText(`${n} of 12`)).toBeVisible()
  // Earned stickers are named; the rest say how to earn them.
  await expect(book.getByRole('img', { name: /, not yet$/ })).toHaveCount(12 - n)

  // Switch to Alder inside the book.
  await book
    .getByRole('group', { name: 'Whose stickers' })
    .getByRole('button', { name: 'Alder' })
    .click()
  await expect(book.getByRole('heading', { name: "Alder's stickers" })).toBeVisible()
})

test('Fresh stickers on Home open the right sticker book', async ({ page }) => {
  await seed(page, withSamples())
  await page.goto('/')
  const fresh = page.getByRole('list', { name: 'Fresh stickers' })
  const first = fresh.getByRole('button').first()
  const who = (await first.getAttribute('aria-label'))?.match(/, (\w+) · /)?.[1]
  await first.click()
  await expect(
    page
      .getByRole('dialog', { name: 'Sticker book' })
      .getByRole('heading', { name: `${who}'s stickers` }),
  ).toBeVisible()
})

test('a win opens to a sticker pack: tear it open for the stickers; Done works without opening', async ({
  page,
}) => {
  await seed(page, household())
  await page.goto('/')
  const uno = async (winner: string) => {
    await startPreset(page, 'Uno')
    await gameSheet(page, 'Uno')
      .getByRole('group', { name: 'Who won?' })
      .getByRole('button', { name: winner })
      .click()
    await expect(victory(page)).toBeVisible()
  }
  // Kate's first win: her crowned chip and her First Crown.
  await uno('Kate')
  const pack = victory(page).getByRole('button', { name: 'Tear open the sticker pack' })
  await expect(victory(page)).toContainText('2 stickers inside')
  await pack.click()
  await expect(victory(page).getByText('First Crown')).toBeVisible()
  await expect(victory(page).getByText('Winner')).toBeVisible()
  await victory(page).getByRole('button', { name: 'Done' }).click()
  await expect(victory(page)).toBeHidden()

  // Next game: leave without opening the pack.
  await uno('Blair')
  await victory(page).getByRole('button', { name: 'Done' }).click()
  await expect(victory(page)).toBeHidden()

  // History › that game lists its stickers; one opens the player's book.
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'History' })
    .click()
  await page.locator('.game-row').last().click()
  const detail = page.getByRole('dialog', { name: 'Uno' })
  const shelf = detail.getByRole('list', { name: 'Stickers from this game' })
  await expect(
    shelf.getByRole('button', { name: /^First Crown, Kate\. Open sticker book$/ }),
  ).toBeVisible()
  // A page pushed inside the game's sheet: the player's book, and back to the game.
  await shelf.getByRole('button').first().click()
  const book = page.getByRole('dialog', { name: "Kate's stickers" })
  await expect(book).toBeVisible()
  await book.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Uno' })).toBeVisible()
})

test('a sticker book opens with the sticker sound (peel, slap, note)', async ({ page }) => {
  // Count the synth's notes (tones; the peel and slap noise run alongside them).
  await page.addInitScript(() => {
    const Real = window.AudioContext
    const log = { notes: 0, noise: 0 }
    ;(window as unknown as { __audio: typeof log }).__audio = log
    window.AudioContext = class extends Real {
      constructor(...args: ConstructorParameters<typeof Real>) {
        super(...args)
        const osc = this.createOscillator.bind(this)
        const src = this.createBufferSource.bind(this)
        this.createOscillator = () => {
          log.notes++
          return osc()
        }
        this.createBufferSource = () => {
          log.noise++
          return src()
        }
      }
    }
  })
  await seed(page, withSamples({ muted: false }))
  await page.goto('/')
  const audio = () =>
    page.evaluate(
      () => (window as unknown as { __audio: { notes: number; noise: number } }).__audio,
    )
  const before = await audio()
  await page.getByRole('button', { name: /^Kate, .*Open sticker book$/ }).click()
  await expect(page.getByRole('dialog', { name: 'Sticker book' })).toBeVisible()
  await expect.poll(async () => (await audio()).notes - before.notes).toBeGreaterThanOrEqual(2)
  expect((await audio()).noise - before.noise).toBeGreaterThanOrEqual(2)
})

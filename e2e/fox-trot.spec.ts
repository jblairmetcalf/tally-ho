import { expect, type Page, test } from '@playwright/test'
import {
  gameSheet,
  household,
  openSettingsArea,
  scoreRound,
  seed,
  startPreset,
  victory,
  withSamples,
} from './helpers'

/** Fox Trot (decisions 27, 29): the song so far, the edit preview, the victory song, the shelf. */

/** The rounds the staff has notes for (each note carries its round; -1 is the riff). */
const roundsOn = async (scope: ReturnType<Page['locator']>) =>
  new Set(
    await scope
      .locator('.staff .note-at')
      .evaluateAll((els) =>
        els.map((e) => Number(e.getAttribute('data-beat'))).filter((b) => b >= 0),
      ),
  ).size
/** The melody notes of one round (a tie sings a chord). */
const melodyOf = (scope: ReturnType<Page['locator']>, round: number) =>
  scope.locator(`.staff .note-at[data-beat="${round}"] .note.melody`)

test('the song so far grows a note per round, plays and stops, and an edit is heard first', async ({
  page,
}) => {
  await seed(page, household())
  await page.goto('/')
  await startPreset(page, 'Flip 7')
  const game = gameSheet(page, 'Flip 7')
  // Before the first round: the caption, not an empty staff.
  await expect(game.getByText("Each round adds a step in the round winner's color")).toBeVisible()
  // The caption holds the staff's height: the first note arrives without moving the page.
  const strip = game.locator('.song-strip')
  const tall = (await strip.boundingBox())?.height
  await scoreRound(page, { Kate: 12, Blair: 4, Alder: 0 })
  await expect(game.locator('.song-strip .staff')).toBeVisible()
  expect((await strip.boundingBox())?.height).toBeCloseTo(tall ?? 0, 0)
  const play = game.getByRole('button', { name: 'Play Flip 7 fox trot' })
  await expect(play).toBeVisible()
  await expect.poll(() => roundsOn(game)).toBe(1)
  await scoreRound(page, { Kate: 5, Blair: 5, Alder: 0 })
  // Every note is plotted; a tie sings a chord: at least two melody notes in round two.
  await expect.poll(() => roundsOn(game)).toBe(2)
  expect(await melodyOf(game, 1).count()).toBeGreaterThanOrEqual(2)
  await play.click()
  const stop = game.getByRole('button', { name: 'Stop Flip 7 fox trot' })
  await expect(stop).toBeVisible()
  await stop.click()
  await expect(play).toBeVisible()

  // Edit round: the round is marked on a preview staff, and "Hear it" plays just that round.
  await game.getByRole('button', { name: 'Edit round 1' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit round 1' })
  expect(await edit.locator('.note-at.hi').count()).toBeGreaterThanOrEqual(1)
  // The scoreboard stays mounted (inert) under this page: find the field by role.
  await edit.getByRole('textbox', { name: 'Blair score' }).fill('30')
  await edit.getByRole('button', { name: 'Hear it' }).click()
  await edit.getByRole('button', { name: 'Save round 1' }).click()
  await expect(
    gameSheet(page, 'Flip 7').getByRole('button', { name: /Flip 7 fox trot$/ }),
  ).toBeVisible()
})

test('a single "Who won?" game has no song so far (it ends on its first note)', async ({
  page,
}) => {
  await seed(page, household())
  await page.goto('/')
  await startPreset(page, 'Uno')
  await expect(gameSheet(page, 'Uno').getByText('The fox trot so far')).toHaveCount(0)
})

test('victory plays the song after the fanfare, with Replay', async ({ page }) => {
  await seed(page, household())
  await page.goto('/')
  await startPreset(page, 'Uno')
  await gameSheet(page, 'Uno').getByRole('button', { name: 'Kate', exact: true }).click()
  await expect(victory(page)).toBeVisible()
  const replay = victory(page).getByRole('button', { name: 'Replay the fox trot' })
  await expect(replay).toBeVisible()
  // About 3.4 s in (after the fanfare and the sting) it plays on its own.
  await expect(victory(page).getByRole('button', { name: 'Stop Uno fox trot' })).toBeVisible({
    timeout: 6000,
  })
  await victory(page).getByRole('button', { name: 'Done' }).click()
  await expect(victory(page)).toBeHidden()
  // Pressed onto the shelf.
  await expect(
    page
      .getByRole('list', { name: 'Fox Trots' })
      .getByRole('button', { name: 'Play Uno fox trot' }),
  ).toBeVisible()
})

test('the shelf: the latest six, one at a time, Play all, a card opens the game; nothing is stored', async ({
  page,
}) => {
  await seed(page, withSamples())
  await page.goto('/')
  const saved = () => page.evaluate(() => localStorage.getItem('tallyho.v3'))
  const before = await saved()
  const shelf = page.getByRole('list', { name: 'Fox Trots' })
  const items = shelf.getByRole('listitem')
  await expect(items).toHaveCount(6)
  // Every card is as tall as the tallest, whatever wraps (a long name, a two-line meta).
  const heights = await shelf
    .locator('.song-card')
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
  expect(new Set(heights).size).toBe(1)
  // The samples repeat games (two Scouts), so each card is found by its place.
  const one = items.nth(0)
  const two = items.nth(1)
  await one.getByRole('button', { name: /^Play .+ fox trot$/ }).click()
  await expect(one.getByRole('button', { name: /^Stop .+ fox trot$/ })).toBeVisible()
  // Playing another stops the first.
  await two.getByRole('button', { name: /^Play .+ fox trot$/ }).click()
  await expect(two.getByRole('button', { name: /^Stop .+ fox trot$/ })).toBeVisible()
  await expect(one.getByRole('button', { name: /^Play .+ fox trot$/ })).toBeVisible()

  // Play the set: Stop from the first song to the last, never back to Play the set between songs.
  await page.getByRole('button', { name: 'Play the set' }).click()
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
  await expect(two.getByRole('button', { name: /^Stop .+ fox trot$/ })).toBeVisible({
    timeout: 8000,
  })
  await expect(page.getByRole('button', { name: 'Play the set' })).toHaveCount(0)
  // As the set plays on, the shelf brings each playing card to the middle.
  const third = items.nth(2)
  await expect(third.getByRole('button', { name: /^Stop .+ fox trot$/ })).toBeVisible({
    timeout: 15000,
  })
  await expect.poll(() => shelf.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  const box = (await third.boundingBox())!
  const view = page.viewportSize()!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(view.width)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play the set' })).toBeVisible()
  // Songs are computed from the rounds: playing them saved nothing.
  expect(await saved()).toBe(before)

  // The whole card is a tap target: its bottom corner (beside the play button) opens the game too.
  // (the set left the shelf on the third card, so that's the one in view)
  const corner = (await third.locator('.song-card').boundingBox())!
  await page.mouse.click(corner.x + corner.width - 12, corner.y + corner.height - 12)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  // A card opens the game, with its song.
  const name = (await one
    .getByRole('button', { name: /^Play .+ fox trot$/ })
    .getAttribute('aria-label'))!.replace(/^Play | fox trot$/g, '')
  await one.getByRole('button', { name: new RegExp(`^${name}, won by .+ Open game$`) }).click()
  const detail = page.getByRole('dialog', { name })
  await expect(detail.getByRole('button', { name: `Play ${name} fox trot` })).toBeVisible()
  // The staff is a picture of the song; only the round play button is a button.
  await expect(detail.locator('button .staff')).toHaveCount(0)
  await expect(detail.locator('.song-strip-row .staff')).toHaveCount(1)
})

test('a game type can pick its song key; Auto is the default', async ({ page }) => {
  await seed(page, household())
  await page.goto('/')
  const { sheet: games } = await openSettingsArea(page, 'Games')
  await games.getByRole('button', { name: /^Edit Flip 7/ }).click()
  const flip = page.getByRole('dialog', { name: 'Flip 7' })
  const key = flip.getByRole('group', { name: 'Song key' })
  await expect(key.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true')
  await key.getByRole('button', { name: 'G', exact: true }).click()
  await flip.getByRole('radio', { name: 'Minor' }).click()
  await flip
    .getByRole('group', { name: 'Chord loop' })
    .getByRole('button', { name: 'i–iv–v–i' })
    .click()
  await page.reload()
  const again = await openSettingsArea(page, 'Games')
  await again.sheet.getByRole('button', { name: /^Edit Flip 7/ }).click()
  const flip2 = page.getByRole('dialog', { name: 'Flip 7' })
  await expect(
    flip2.getByRole('group', { name: 'Song key' }).getByRole('button', { name: 'G', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(flip2.getByRole('radio', { name: 'Minor' })).toBeChecked()
})

test('scoring a round sings its note on the synth (no samples)', async ({ page }) => {
  await page.addInitScript(() => {
    const Real = window.AudioContext
    const log = { notes: 0, buffers: 0 }
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
          log.buffers++
          return src()
        }
      }
    }
  })
  await seed(page, household({ muted: false }))
  await page.goto('/')
  await startPreset(page, 'Flip 7')
  const audio = () =>
    page.evaluate(
      () => (window as unknown as { __audio: { notes: number; buffers: number } }).__audio,
    )
  const before = await audio()
  await scoreRound(page, { Kate: 12, Blair: 4, Alder: 0 })
  // The round's chord tone over its bass.
  await expect.poll(async () => (await audio()).notes - before.notes).toBeGreaterThanOrEqual(2)
  expect((await audio()).buffers - before.buffers).toBeLessThanOrEqual(1)
})

test('leaving the app stops a song (its playhead does not run on unheard)', async ({ page }) => {
  await seed(page, withSamples())
  await page.goto('/')
  const card = page.getByRole('list', { name: 'Fox Trots' }).getByRole('listitem').first()
  await card.getByRole('button', { name: /^Play .+ fox trot$/ }).click()
  await expect(card.getByRole('button', { name: /^Stop .+ fox trot$/ })).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(card.getByRole('button', { name: /^Play .+ fox trot$/ })).toBeVisible()
})

test('the victory fox trot ends on a coda: more synth notes than its riff and rounds', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Real = window.AudioContext
    const log = { notes: 0, buffers: 0 }
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
          log.buffers++
          return src()
        }
      }
    }
  })
  await seed(page, household({ muted: false }))
  await page.goto('/')
  await startPreset(page, 'Uno')
  const audio = () =>
    page.evaluate(
      () => (window as unknown as { __audio: { notes: number; buffers: number } }).__audio,
    )
  await gameSheet(page, 'Uno').getByRole('button', { name: 'Kate', exact: true }).click()
  await expect(victory(page)).toBeVisible()
  // After the fanfare and the sting: the song starts on its own, all its notes scheduled at once.
  const before = await audio()
  await expect(victory(page).getByRole('button', { name: 'Stop Uno fox trot' })).toBeVisible({
    timeout: 6000,
  })
  const after = await audio()
  // A one-round song is a 6–8 note riff and 2 notes for the round; the coda (cadence, a story,
  // the chord) adds at least 7 more.
  expect(after.notes - before.notes).toBeGreaterThanOrEqual(15)
  expect(after.buffers - before.buffers).toBeLessThanOrEqual(1)
})

test('the key picker plays each pick: a key its chord, a loop its four chords', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Real = window.AudioContext
    const log = { notes: 0 }
    ;(window as unknown as { __audio: typeof log }).__audio = log
    window.AudioContext = class extends Real {
      constructor(...args: ConstructorParameters<typeof Real>) {
        super(...args)
        const osc = this.createOscillator.bind(this)
        this.createOscillator = () => {
          log.notes++
          return osc()
        }
      }
    }
  })
  await seed(page, household({ muted: false }))
  await page.goto('/')
  const notes = () =>
    page.evaluate(() => (window as unknown as { __audio: { notes: number } }).__audio.notes)
  const { sheet: games } = await openSettingsArea(page, 'Games')
  await games.getByRole('button', { name: /^Edit Flip 7/ }).click()
  const flip = page.getByRole('dialog', { name: 'Flip 7' })
  const key = flip.getByRole('group', { name: 'Song key' })
  let before = await notes()
  await key.getByRole('button', { name: 'D', exact: true }).click()
  // D: its chord (three tones) over its root.
  await expect.poll(async () => (await notes()) - before).toBe(4)
  before = await notes()
  await flip.getByRole('radio', { name: 'Minor' }).click()
  await expect.poll(async () => (await notes()) - before).toBe(4)
  before = await notes()
  await flip.getByRole('group', { name: 'Chord loop' }).getByRole('button').nth(1).click()
  // A loop: four chords of four notes.
  await expect.poll(async () => (await notes()) - before).toBe(16)
})

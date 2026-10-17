/**
 * Family sync against the Firebase emulators. Runs only in the `cloud` project
 * (`pnpm e2e:cloud`, CLOUD_E2E=1), which builds the app with NEXT_PUBLIC_FIREBASE_EMULATOR=1.
 * The emulators need Java, so this runs in CI (the `cloud` job).
 */
import { expect, test } from '@playwright/test'
import {
  ALDER,
  BLAIR,
  closeSheets,
  newPhone,
  openSettings,
  resetFamily,
  STRANGER,
  signInAs,
  submitSignIn,
  syncBadge,
  waitForOfflineShell,
} from './cloud-helpers'
import { card, scoreRound, startPreset } from './helpers'

// Each test starts from a clean family in the emulators (tests in this file run in order).
test.beforeEach(async () => {
  await resetFamily()
})

const OFFLINE_OR_PENDING = /^(Offline · saved on this phone|Saved on this phone · syncing)$/

test('demo by default; a member signs in and the phone syncs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Demo', exact: true })).toBeVisible()
  await signInAs(page, BLAIR)
  await expect(page.getByRole('button', { name: 'Demo', exact: true })).toHaveCount(0)

  const settings = await openSettings(page)
  await expect(settings.getByText('Signed in as Blair')).toBeVisible()
})

test('a game started on one phone shows up live on another', async ({ browser, baseURL }) => {
  const a = await newPhone(browser, baseURL!)
  const b = await newPhone(browser, baseURL!)
  await signInAs(a.page, BLAIR)
  await signInAs(b.page, ALDER)

  await startPreset(a.page, 'Uno')
  await scoreRound(a.page, { Kate: 10, Blair: 20, Alder: 5 })
  await expect(card(a.page, 'Blair').locator('.total')).toHaveText('20')

  // Alder's phone: the live game appears on Home, one round in.
  const resume = b.page.locator('button.resume')
  await expect(resume).toContainText('Uno', { timeout: 20_000 })
  await expect(resume).toContainText('Round 2')
  await resume.click()
  await expect(b.page.getByRole('heading', { level: 1, name: 'Uno' })).toBeVisible()
  await expect(card(b.page, 'Blair').locator('.total')).toHaveText('20')

  // And keeps following it.
  await scoreRound(a.page, { Kate: 1, Blair: 2, Alder: 3 })
  await expect(card(b.page, 'Alder').locator('.total')).toHaveText('8', { timeout: 20_000 })

  await a.context.close()
  await b.context.close()
})

test('a round scored offline survives a reload and syncs when back online', async ({
  browser,
  baseURL,
}) => {
  const a = await newPhone(browser, baseURL!)
  const b = await newPhone(browser, baseURL!)
  await signInAs(a.page, BLAIR)
  await signInAs(b.page, ALDER)
  await waitForOfflineShell(a.page)

  await startPreset(a.page, 'Uno')
  await scoreRound(a.page, { Kate: 10, Blair: 20, Alder: 5 })
  const resume = b.page.locator('button.resume')
  await expect(resume).toContainText('Round 2', { timeout: 20_000 })
  await resume.click()
  await expect(card(b.page, 'Blair').locator('.total')).toHaveText('20')

  // Blair's phone drops off the network and keeps scoring.
  await a.context.setOffline(true)
  await scoreRound(a.page, { Kate: 0, Blair: 15, Alder: 0 })
  await expect(card(a.page, 'Blair').locator('.total')).toHaveText('35')

  // Reload while offline: the round is still there (two rounds in, so "Round 3"), and the
  // Home badge says it's waiting.
  await a.page.reload()
  const gameHeading = a.page.getByRole('heading', { level: 1, name: 'Uno' })
  const resumeA = a.page.locator('button.resume')
  await expect(gameHeading.or(resumeA)).toBeVisible({ timeout: 20_000 })
  if (await gameHeading.isVisible()) {
    await expect(card(a.page, 'Blair').locator('.total')).toHaveText('35')
    await a.page.getByRole('button', { name: 'Back to home' }).click()
  }
  await expect(resumeA).toContainText('Round 3')
  await expect(syncBadge(a.page, OFFLINE_OR_PENDING)).toBeVisible({ timeout: 20_000 })

  // Alder hasn't seen it yet.
  await expect(card(b.page, 'Blair').locator('.total')).toHaveText('20')

  // Back online: it reaches Alder, and Blair's badge settles to Synced.
  await a.context.setOffline(false)
  await expect(card(b.page, 'Blair').locator('.total')).toHaveText('35', { timeout: 30_000 })
  await expect(syncBadge(a.page, 'Synced')).toBeVisible({ timeout: 30_000 })

  await a.context.close()
  await b.context.close()
})

test('someone without a members doc is turned away', async ({ page }) => {
  await page.goto('/')
  const sheet = await submitSignIn(page, STRANGER.email)
  await expect(sheet.getByRole('alert')).toHaveText('This scoreboard is just for the family.', {
    timeout: 20_000,
  })
  await closeSheets(page)
  await expect(page.getByRole('button', { name: 'Demo', exact: true })).toBeVisible()
})

test('signing out goes back to the demo', async ({ page }) => {
  await signInAs(page, BLAIR)
  const settings = await openSettings(page)
  await settings.getByRole('button', { name: 'Sign out' }).click()
  await settings.getByRole('button', { name: 'Tap again to sign out' }).click()
  await closeSheets(page)
  await expect(page.getByRole('button', { name: 'Demo', exact: true })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('button', { name: 'Synced' })).toHaveCount(0)

  // Still demo after a reload: the session flag is gone.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Demo', exact: true })).toBeVisible()
})

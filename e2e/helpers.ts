import { expect, type Page } from '@playwright/test'
import { emptyStore, freshStore, type Preset, type Store, systemClock } from '../packages/core/src'

export const KEY = 'tallyho.v3'

/** Seed localStorage before the app boots (only if empty, so reloads keep what the test did). */
export async function seed(page: Page, store: Store) {
  await page.addInitScript(
    ([key, json]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, json)
    },
    [KEY, JSON.stringify(store)] as const,
  )
}

/**
 * A lowest-wins game for the specs, added beside the defaults (which include the Flip 7 race
 * and Sushi Go rounds the other specs use).
 */
const TEST_PRESETS: Preset[] = [
  { id: 'hearts', name: 'Hearts', goal: 'score', target: 100, lowWins: true },
]

/** A household with no history: Kate, Blair and Alder, sound off. */
export function household(patch: Partial<Store['prefs']> = {}): Store {
  const s = emptyStore()
  s.prefs = { ...s.prefs, muted: true, ...patch }
  s.presets = [...s.presets, ...TEST_PRESETS]
  return s
}

export function withSamples(patch: Partial<Store['prefs']> = {}): Store {
  const s = freshStore(systemClock)
  s.prefs = { ...s.prefs, muted: true, ...patch }
  s.presets = [...s.presets, ...TEST_PRESETS]
  return s
}

export async function openNewGame(page: Page) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'New game' })
    .click()
  await expect(page.getByRole('dialog', { name: 'New game' })).toBeVisible()
}

/** Pick a preset and deal in with the default line-up. */
export async function startPreset(page: Page, preset: string) {
  await openNewGame(page)
  const sheet = page.getByRole('dialog', { name: 'New game' })
  // Low-wins presets carry a "Low" tag in their name.
  await sheet.getByRole('button', { name: new RegExp(`^${preset}(\\s*Low)?$`) }).click()
  await sheet.getByRole('button', { name: `Deal in · ${preset}` }).click()
  await expect(page.getByRole('heading', { level: 1, name: preset })).toBeVisible()
  // The sheet traps focus until its closing animation ends.
  await expect(sheet).toBeHidden()
}

/** Type one round on the game screen and score it. */
export async function scoreRound(page: Page, scores: Record<string, number | ''>) {
  for (const [name, v] of Object.entries(scores))
    await page.getByLabel(`${name} score`).fill(String(v))
  await page.getByRole('button', { name: /^Score round \d+$/ }).click()
}

export const card = (page: Page, name: string) => page.locator('.pcard', { hasText: name })
export const toast = (page: Page) => page.getByRole('status').filter({ hasText: /\w/ })
export const victory = (page: Page) => page.locator('.victory')

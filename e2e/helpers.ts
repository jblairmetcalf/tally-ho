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
  // One round per player: no default uses it any more (the family plays Scout as "Who won?").
  {
    id: 'round-robin',
    name: 'Round Robin',
    goal: 'rounds',
    target: 3,
    lowWins: false,
    roundsPerPlayer: true,
  },
]

/**
 * A household with no history: Kate, Blair and Alder, sound off, and the install guide already
 * seen (so its one-time pop-up never lands on top of a spec; `e2e/install-share.spec.ts` tests it).
 */
export function household(patch: Partial<Store['prefs']> = {}): Store {
  const s = emptyStore()
  s.prefs = { ...s.prefs, muted: true, installHintSeen: true, ...patch }
  s.presets = [...s.presets, ...TEST_PRESETS]
  return s
}

export function withSamples(patch: Partial<Store['prefs']> = {}): Store {
  const s = freshStore(systemClock)
  s.prefs = { ...s.prefs, muted: true, installHintSeen: true, ...patch }
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

/** Open Settings from the home header. */
export async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await expect(settings).toBeVisible()
  return settings
}

/**
 * Settings, then one of its areas: Players, Games and Appearance are rows on the landing, each
 * pushing its page inside the one Settings sheet (their editors push a third). The dialog is
 * named by the page on top, so `settings` matches again once you're back on the landing.
 */
export async function openSettingsArea(page: Page, area: 'Players' | 'Games' | 'Appearance') {
  const settings = await openSettings(page)
  await settings.getByRole('button', { name: new RegExp(`^${area}`) }).click()
  const sheet = page.getByRole('dialog', { name: area })
  await expect(sheet).toBeVisible()
  return { settings, sheet }
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

/**
 * Helpers for the family-sync e2e (cloud.spec.ts). They talk to the Firebase emulators that
 * `pnpm e2e:cloud` starts (firebase emulators:exec): Auth on :9099, Firestore on :8080,
 * project demo-tally. The default export is the cloud project's Playwright globalSetup.
 */
import { type Browser, devices, expect, type Page } from '@playwright/test'

export const PROJECT = 'demo-tally'
const AUTH = 'http://127.0.0.1:9099'
const FIRESTORE = 'http://127.0.0.1:8080'

export const PASSWORD = 'tally-ho-e2e'
export const BLAIR = { email: 'blair@example.com', name: 'Blair', playerId: 'blair' }
export const ALDER = { email: 'alder@example.com', name: 'Alder', playerId: 'alder' }
export const STRANGER = { email: 'stranger@example.com' }

async function call(method: string, url: string, body?: unknown, headers = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${await res.text()}`)
  return res
}

/** Wipe every Firestore document and Auth account in the emulators. */
export async function clearEmulators() {
  await call('DELETE', `${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`)
  await call('DELETE', `${AUTH}/emulator/v1/projects/${PROJECT}/accounts`)
}

async function signUp(email: string) {
  await call('POST', `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    email,
    password: PASSWORD,
    returnSecureToken: true,
  })
}

/** What Blair does once in the console: a members doc per family member (rules bypassed). */
async function addMember(m: { email: string; name: string; playerId: string }) {
  const path = `projects/${PROJECT}/databases/(default)/documents/members/${encodeURIComponent(m.email)}`
  await call(
    'PATCH',
    `${FIRESTORE}/v1/${path}`,
    { fields: { name: { stringValue: m.name }, playerId: { stringValue: m.playerId } } },
    { Authorization: 'Bearer owner' },
  )
}

/** A clean family: Blair and Alder are members; the stranger has an account but no members doc. */
export async function resetFamily() {
  await clearEmulators()
  for (const u of [BLAIR, ALDER, STRANGER]) await signUp(u.email)
  for (const m of [BLAIR, ALDER]) await addMember(m)
}

export default async function globalSetup() {
  try {
    await resetFamily()
  } catch (e) {
    throw new Error(
      `Cloud e2e needs the Firebase emulators (run it with \`pnpm e2e:cloud\`).\n${String(e)}`,
    )
  }
}

/** A second (or first) phone: its own context, so its own IndexedDB, auth and offline switch. */
export async function newPhone(browser: Browser, baseURL: string) {
  const { defaultBrowserType: _, ...iphone } = devices['iPhone 14']
  const context = await browser.newContext({ ...iphone, baseURL })
  const page = await context.newPage()
  return { context, page }
}

export const syncBadge = (page: Page, label: string | RegExp) =>
  page.getByRole('button', { name: label }).first()

/** Close whatever sheet is open (if any) so the Home header is in reach. */
export async function closeSheets(page: Page) {
  const dialog = page.getByRole('dialog')
  for (let i = 0; i < 3 && (await dialog.count()) > 0; i++) {
    const close = dialog.last().getByRole('button', { name: 'Close' })
    if ((await close.count()) === 0) break
    await close.first().click()
    await expect(dialog).toHaveCount(0)
  }
}

export async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Settings' })
  await expect(sheet).toBeVisible()
  return sheet
}

/** Settings → "Family sign in" → Email/Password → "Sign in". Does not assert the outcome. */
export async function submitSignIn(page: Page, email: string, password = PASSWORD) {
  const settings = await openSettings(page)
  await settings.getByRole('button', { name: 'Family sign in' }).click()
  const sheet = page.getByRole('dialog', { name: 'Family sign in' })
  await expect(sheet).toBeVisible()
  await sheet.getByLabel('Email').fill(email)
  await sheet.getByLabel('Password', { exact: true }).fill(password)
  await sheet.getByRole('button', { name: 'Sign in', exact: true }).click()
  return sheet
}

/** Sign in as a member and wait until the phone is in family mode and synced. */
export async function signInAs(page: Page, who: { email: string; name: string }) {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Demo', exact: true })).toBeVisible()
  const sheet = await submitSignIn(page, who.email)
  await expect(page.getByText(`Welcome, ${who.name}!`)).toBeVisible({ timeout: 20_000 })
  await expect(sheet).toBeHidden()
  await closeSheets(page)
  await expect(syncBadge(page, 'Synced')).toBeVisible({ timeout: 20_000 })
}

/** Wait for the service worker to precache the shell, so a reload works offline. */
export async function waitForOfflineShell(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r))
  })
}

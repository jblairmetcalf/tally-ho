import { createContext, useContext, useSyncExternalStore } from 'react'

/**
 * Installing Tally Ho! as a Home Screen app: which phone this is, whether it's already
 * installed, and Chromium's one-tap install prompt.
 */

export type Platform = 'ios' | 'android' | 'desktop'
/** On iOS: Safari, or another browser (Chrome, Firefox, Edge… all WebKit underneath). */
export type IosBrowser = 'safari' | 'other'

export interface InstallInfo {
  /** Running from the Home Screen (standalone), or just installed from this tab. */
  installed: boolean
  platform: Platform
  iosBrowser: IosBrowser
  /** Chromium offered its install prompt: one tap installs. */
  canPrompt: boolean
}

export interface InstallApi extends InstallInfo {
  /** Show Chromium's install prompt. Resolves to what the person chose. */
  prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'>
}

/** iOS browsers that aren't Safari name themselves in the user agent. */
const IOS_OTHER =
  /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo|YaBrowser|Brave|FBAN|FBAV|Instagram|Line\//

/**
 * Which kind of device a user agent describes. iPadOS asks for desktop sites and says
 * "Macintosh"; touch points give it away.
 */
export function detectPlatform(
  ua: string,
  maxTouchPoints = 0,
): { platform: Platform; iosBrowser: IosBrowser } {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)
  if (ios) return { platform: 'ios', iosBrowser: IOS_OTHER.test(ua) ? 'other' : 'safari' }
  if (/Android/i.test(ua)) return { platform: 'android', iosBrowser: 'safari' }
  return { platform: 'desktop', iosBrowser: 'safari' }
}

/** Opened from the Home Screen: the standard display-mode query, or iOS's own flag. */
export function isStandalone(displayModeStandalone: boolean, navigatorStandalone?: boolean) {
  return displayModeStandalone || navigatorStandalone === true
}

/** Chromium's `beforeinstallprompt` event (not in the DOM typings). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
let justInstalled = false
let version = 0
const subs = new Set<() => void>()
const changed = () => {
  version++
  for (const cb of subs) cb()
}

/**
 * Catch the install prompt as early as possible: Chromium fires it once per page load, often
 * before anything asks. Runs when this module loads; safe to call again.
 */
let listening = false
function listenForInstall() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep it for our own button instead of Chrome's mini-infobar.
    e.preventDefault()
    deferred = e as InstallPromptEvent
    changed()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    justInstalled = true
    changed()
  })
}
listenForInstall()

const subscribe = (cb: () => void) => {
  subs.add(cb)
  return () => subs.delete(cb)
}
const snapshot = () => version

/** What this device is, right now. */
export function readInstall(): InstallInfo {
  if (typeof window === 'undefined')
    return { installed: false, platform: 'desktop', iosBrowser: 'safari', canPrompt: false }
  const nav = navigator as Navigator & { standalone?: boolean }
  const standalone = isStandalone(
    window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    nav.standalone,
  )
  return {
    ...detectPlatform(nav.userAgent, nav.maxTouchPoints),
    installed: standalone || justInstalled,
    canPrompt: !!deferred,
  }
}

async function showPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred
  if (!e) return 'unavailable'
  // The event can only be used once.
  deferred = null
  changed()
  try {
    await e.prompt()
    return (await e.userChoice).outcome
  } catch {
    return 'unavailable'
  }
}

/**
 * Stories only: pretend to be a given device and address, so every platform's guide can be
 * shown (and the share code is the same on every run).
 */
export const InstallPreview = createContext<{ info?: Partial<InstallInfo>; url?: string } | null>(
  null,
)

/** This device's install state, live: `canPrompt` and `installed` update as Chromium speaks. */
export function useInstall(): InstallApi {
  useSyncExternalStore(subscribe, snapshot, snapshot)
  const preview = useContext(InstallPreview)
  const info = { ...readInstall(), ...preview?.info }
  return {
    ...info,
    prompt: preview?.info ? async () => 'unavailable' as const : showPrompt,
  }
}

/** Where Tally Ho! lives: wherever it's running (the Vercel address once deployed). */
export function useShareUrl(): string {
  const preview = useContext(InstallPreview)
  if (preview?.url) return preview.url
  return typeof location === 'undefined' ? '/' : `${location.origin}/`
}

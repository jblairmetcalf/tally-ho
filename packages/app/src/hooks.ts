import type { ThemePref } from '@tally/core'
import { THEME_COLOR, type ThemeId } from '@tally/ui'
import { useEffect, useState } from 'react'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemTheme(): ThemeId {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/**
 * Resolve the theme preference to 'dark' | 'light', following the OS when it is 'system'.
 * With `syncDocument` (the app, not stories) it also keeps `<meta name="theme-color">` and
 * `<html data-theme>` in step, so the status bar and overscroll match the page.
 */
export function useThemePref(pref: ThemePref = 'system', syncDocument = true): ThemeId {
  const [system, setSystem] = useState<ThemeId>(systemTheme)

  useEffect(() => {
    if (pref !== 'system' || typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(DARK_QUERY)
    const on = () => setSystem(mq.matches ? 'dark' : 'light')
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [pref])

  const theme: ThemeId = pref === 'system' ? system : pref

  useEffect(() => {
    if (!syncDocument || typeof document === 'undefined') return
    const color = THEME_COLOR[theme]
    let metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    if (!metas.length) {
      const m = document.createElement('meta')
      m.name = 'theme-color'
      document.head.appendChild(m)
      metas = [m]
    }
    for (const m of metas) {
      m.removeAttribute('media')
      m.content = color
    }
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme, syncDocument])

  return theme
}

/**
 * Keep the screen awake while `active` (a game is on screen and the pref is on). The browser
 * drops the lock whenever the page is hidden, so it is taken again on return. No-op when the
 * Screen Wake Lock API is missing.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      if (sentinel && !sentinel.released) return
      try {
        const s = await navigator.wakeLock.request('screen')
        if (cancelled) {
          s.release().catch(() => {})
          return
        }
        sentinel = s
      } catch {
        /* denied (battery saver, not visible): try again on the next visibility change */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}

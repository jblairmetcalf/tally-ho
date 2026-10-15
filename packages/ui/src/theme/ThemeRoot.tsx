import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../cx'

export type ThemeId = 'dark' | 'light'
export const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Daylight' },
]

/** The colour the browser chrome / PWA status bar should be for each theme. */
export const THEME_COLOR: Record<ThemeId, string> = { dark: '#13112E', light: '#FFF4E2' }

export interface ThemeRootProps {
  theme: ThemeId
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Pin the wallpaper to the viewport (the app does; stories don't). */
  fixed?: boolean
}

/** Scopes tokens, base type and the suit wallpaper. Everything in Tally Ho! renders inside one. */
export function ThemeRoot({ theme, children, className, style, fixed }: ThemeRootProps) {
  return (
    <div data-theme={theme} className={cx('tally', fixed && 'fixed-bg', className)} style={style}>
      {children}
    </div>
  )
}

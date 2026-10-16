import { Eyebrow, THEMES, type ThemeId, ThemeRoot } from '@tally/ui'
import type { CSSProperties, ReactNode } from 'react'

/** The theme a foundations page renders in: the toolbar's choice, dark when "both". */
export const pageTheme = (globals: Record<string, unknown>): ThemeId =>
  globals.theme === 'light' ? 'light' : 'dark'

export const BARE = { tally: { bare: true } }

export interface PageProps {
  theme: ThemeId
  eyebrow?: string
  title: string
  lede: ReactNode
  children: ReactNode
}

/** A foundations page: a playful header and a column of sections, in one theme. */
export function Page({ theme, eyebrow = 'Foundations', title, lede, children }: PageProps) {
  return (
    <ThemeRoot theme={theme} className="selectable min-h-dvh">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-14 px-6 pt-12 pb-24">
        <header className="flex flex-col gap-3">
          <Eyebrow className="text-jade-text">
            <span aria-hidden="true">♠ ♥ ♦ ♣ </span>
            {`Tally Ho! · ${eyebrow}`}
          </Eyebrow>
          <h1
            className="display m-0"
            style={{
              fontSize: 'clamp(44px, 8vw, 72px)',
              color: 'var(--amber-display)',
              textShadow: 'var(--display-shadow)',
            }}
          >
            {title}
          </h1>
          <div className="max-w-[680px] text-[17px] text-muted leading-relaxed">{lede}</div>
        </header>
        {children}
      </div>
    </ThemeRoot>
  )
}

export interface SectionProps {
  title: string
  note?: ReactNode
  children: ReactNode
}

export function Section({ title, note, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-line border-b-[1.5px] border-dashed pb-3">
        <h2 className="display m-0 text-[30px]" style={{ textShadow: 'var(--display-shadow)' }}>
          {title}
        </h2>
        {note && <p className="m-0 max-w-[680px] text-muted">{note}</p>}
      </div>
      {children}
    </section>
  )
}

/** Render the same content in Dark and Daylight, side by side. */
export function ThemePair({
  children,
  className,
  style,
}: {
  children: (theme: ThemeId) => ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {THEMES.map((t) => (
        <ThemeRoot
          key={t.id}
          theme={t.id}
          className={`overflow-hidden rounded-[22px] border-[1.5px] border-line p-5 ${className ?? ''}`}
          style={style}
        >
          <p className="sb-label">{t.label}</p>
          {children(t.id)}
        </ThemeRoot>
      ))}
    </div>
  )
}

/** Small monospace text for token names and values. */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <code
      className={className}
      style={{
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </code>
  )
}

/** A rounded label: "AAA", "Pulse", etc. */
export function Tag({
  tone,
  children,
}: {
  tone: 'jade' | 'amber' | 'coral' | 'lav' | 'muted'
  children: ReactNode
}) {
  const bg = tone === 'muted' ? 'var(--line)' : `var(--${tone})`
  return (
    <span
      className="inline-flex items-center rounded-[7px] px-1.5 py-px font-black text-[10.5px] uppercase tracking-[0.06em]"
      style={{ background: bg, color: tone === 'muted' ? 'var(--text)' : 'var(--on-accent)' }}
    >
      {children}
    </span>
  )
}

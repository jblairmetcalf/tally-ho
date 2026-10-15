import type { Preview } from '@storybook/react'
import { THEMES, type ThemeId, ThemeRoot } from '@tally/ui'
import './preview.css'

/**
 * What a story can ask of the preview, under `parameters.tally`:
 *
 *   overlay  the story covers the viewport (sheet, victory, toast): render one theme full-width.
 *            Pick which in the toolbar; default dark.
 *   bare     the story owns the whole canvas and its own ThemeRoot (screens, foundations pages).
 *   width    column width in px (default 390, a phone).
 */
export interface TallyParameters {
  overlay?: boolean
  bare?: boolean
  width?: number
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'both', title: 'Dark + Daylight' },
          ...THEMES.map((t) => ({ value: t.id, title: t.label })),
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'both' },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true, matchers: { color: /(background|color)$/i } },
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Start here', 'Colour', 'Type', 'Shape', 'Motion', 'Sound', 'Haptics', 'Icons', 'Brand'],
          'Brand',
          'Primitives',
          'Scoreboard',
          'Sheets',
          'Screens',
        ],
      },
    },
    a11y: { options: { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } },
  },
  decorators: [
    (Story, ctx) => {
      const p = (ctx.parameters.tally ?? {}) as TallyParameters
      if (p.bare) return <Story />
      const chosen = ctx.globals.theme as ThemeId | 'both'
      if (p.overlay) {
        const id: ThemeId = chosen === 'light' ? 'light' : 'dark'
        return (
          <ThemeRoot theme={id} className="min-h-dvh p-6">
            <p className="sb-label">{`${id === 'dark' ? 'Dark' : 'Daylight'} · overlay — switch theme in the toolbar`}</p>
            <Story />
          </ThemeRoot>
        )
      }
      const list = chosen === 'both' ? THEMES : THEMES.filter((t) => t.id === chosen)
      const width = p.width ?? 390
      return (
        <div className="sb-bench flex flex-wrap items-stretch">
          {list.map((t) => (
            <ThemeRoot key={t.id} theme={t.id} className="min-w-0 flex-1 basis-[360px] p-6">
              <div style={{ maxWidth: width, margin: '0 auto' }}>
                <p className="sb-label">{t.label}</p>
                <Story />
              </div>
            </ThemeRoot>
          ))}
        </div>
      )
    },
  ],
}

export default preview

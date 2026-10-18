import type { Preview } from '@storybook/react'
import { THEMES, type ThemeId, ThemeRoot } from '@tally/ui'
import { create } from 'storybook/internal/theming'
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
  // Every component gets a Docs page: all its states on one scroll, with its description and
  // controls — the fastest way to review. Full-screen stories (sheets, overlays, screens and
  // the foundations pages) opt out with `tags: ['!autodocs']` and keep their own entries.
  tags: ['autodocs'],
  parameters: {
    docs: {
      theme: create({
        base: 'dark',
        appBg: '#13112E',
        appContentBg: '#1B1840',
        appPreviewBg: '#13112E',
        appBorderColor: '#3E3878',
        textColor: '#F5F2FF',
        textMutedColor: '#A29BD0',
        colorPrimary: '#FFB800',
        colorSecondary: '#00D4AA',
        fontBase: '"Nunito", ui-rounded, system-ui, sans-serif',
      }),
      toc: false,
    },
    layout: 'fullscreen',
    // Colour pickers only for CSS colour props (`background`, `…Color`); a bare `color` here
    // is a palette slot (0–7) and gets its own control.
    controls: { expanded: true, matchers: { color: /^(background|.+Color)$/ } },
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Start here', 'Colour', 'Type', 'Shape', 'Motion', 'Sound', 'Haptics', 'Icons'],
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
        // On a Docs page each state sits in a row of others: size it to its content.
        <div
          className={`sb-bench flex flex-wrap items-stretch${ctx.viewMode === 'docs' ? ' sb-bench--docs' : ''}`}
        >
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

import { addons } from 'storybook/internal/manager-api'
import { create } from 'storybook/internal/theming'

addons.setConfig({
  // A big canvas by default: the panel starts closed; ⌥A (or the toolbar button) opens it.
  bottomPanelHeight: 0,
  // Open on a short sidebar: the foundations, then each section folded until you want it.
  sidebar: {
    showRoots: true,
    collapsedRoots: ['brand', 'primitives', 'scoreboard', 'sheets', 'screens'],
  },
  theme: create({
    base: 'dark',
    brandTitle: 'Tally Ho! design system',
    colorPrimary: '#FFB800',
    colorSecondary: '#00D4AA',
    appBg: '#13112E',
    appContentBg: '#1B1840',
    appBorderColor: '#3E3878',
    barBg: '#24204D',
    textColor: '#F5F2FF',
    textMutedColor: '#A29BD0',
    fontBase: '"Nunito", ui-rounded, system-ui, sans-serif',
  }),
})

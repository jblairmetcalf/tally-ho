import { addons } from 'storybook/internal/manager-api'
import { create } from 'storybook/internal/theming'

addons.setConfig({
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

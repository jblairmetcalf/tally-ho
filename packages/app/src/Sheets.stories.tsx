import type { Meta, StoryObj } from '@storybook/react'
import { SCENARIOS } from './fixtures'
import { Frames } from './StoryFrames'

const meta: Meta<typeof Frames> = {
  title: 'Sheets/App sheets',
  component: Frames,
  parameters: { tally: { bare: true }, layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof Frames>

export const NewGame: Story = {
  args: { store: SCENARIOS.firstRun, ui: { sheet: { type: 'new' }, sheetKey: 1 } },
}

export const EditRound: Story = {
  args: {
    store: SCENARIOS.flip7Race,
    ui: { screen: 'game', sheet: { type: 'round', idx: 1 }, sheetKey: 1 },
  },
}

export const EndGame: Story = {
  args: { store: SCENARIOS.flip7Race, ui: { screen: 'game', sheet: { type: 'end' }, sheetKey: 1 } },
}

export const EndGameTied: Story = {
  args: { store: SCENARIOS.tiebreak, ui: { screen: 'game', sheet: { type: 'end' }, sheetKey: 1 } },
}

export const GameDetail: Story = {
  args: { store: SCENARIOS.firstRun, ui: { sheet: { type: 'detail', id: 's0' }, sheetKey: 1 } },
}

export const Settings: Story = {
  args: { store: SCENARIOS.firstRun, ui: { sheet: { type: 'settings' }, sheetKey: 1 } },
}

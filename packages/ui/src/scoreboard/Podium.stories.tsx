import type { Meta, StoryObj } from '@storybook/react'
import { podiumRows, SAMPLES } from './fixtures'
import { Podium } from './Podium'

const meta: Meta<typeof Podium> = {
  title: 'Scoreboard/Podium',
  component: Podium,
  args: { rows: podiumRows(SAMPLES[0]!), delayMs: 0 },
}
export default meta
type Story = StoryObj<typeof Podium>

/** The Detail sheet's finishing order: no delay, no "Next time". */
export const Plain: Story = {}
/** The victory beat: rows rise from 750 ms, 110 ms apart; last place gets "Next time" and wobbles. */
export const VictoryTiming: Story = { args: { showLast: true, delayMs: undefined } }
/** With two players nobody is "last". */
export const TwoPlayers: Story = {
  args: {
    showLast: true,
    rows: [
      { id: 'kate', name: 'Kate', color: 0, total: 214 },
      { id: 'blair', name: 'Blair', color: 1, total: 187 },
    ],
  },
}

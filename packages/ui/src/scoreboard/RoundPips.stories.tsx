import type { Meta, StoryObj } from '@storybook/react'
import { RoundPips } from './RoundPips'

const meta: Meta<typeof RoundPips> = {
  title: 'Scoreboard/RoundPips',
  component: RoundPips,
  args: { target: 3, done: 0 },
}
export default meta
type Story = StoryObj<typeof RoundPips>

export const FirstRound: Story = {}
export const MidGame: Story = { args: { target: 10, done: 4 } }
export const LastRound: Story = { args: { target: 3, done: 2 } }
/** All played (a tiebreak round may follow): nothing pulses, "0 left". */
export const AllPlayed: Story = { args: { target: 3, done: 3 } }

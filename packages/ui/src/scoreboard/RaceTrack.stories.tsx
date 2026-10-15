import type { Meta, StoryObj } from '@storybook/react'
import { players } from './fixtures'
import { RaceTrack } from './RaceTrack'

const withTotals = (totals: number[]) =>
  players(totals.length).map((p, i) => ({ ...p, total: totals[i] ?? 0 }))

const meta: Meta<typeof RaceTrack> = {
  title: 'Scoreboard/RaceTrack',
  component: RaceTrack,
  args: { target: 200, lowWins: false, players: withTotals([0, 0, 0]) },
}
export default meta
type Story = StoryObj<typeof RaceTrack>

export const Start: Story = {}
export const Early: Story = { args: { players: withTotals([24, 41, 8]) } }
export const Mid: Story = { args: { players: withTotals([96, 131, 74]) } }
/** Someone has crossed the finish: their chip parks on the line. */
export const OverTheLine: Story = { args: { players: withTotals([212, 168, 151]) } }
/** Low score wins: the coral checkered line is where you bust. */
export const LowWinsBust: Story = {
  args: { target: 100, lowWins: true, players: withTotals([38, 91, 104]) },
}
export const TwoPlayers: Story = { args: { players: withTotals([60, 145]) } }
export const SixPlayers: Story = {
  args: { players: withTotals([180, 22, 97, 140, 65, 0]) },
}

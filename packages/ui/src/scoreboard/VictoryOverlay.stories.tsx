import type { Meta, StoryObj } from '@storybook/react'
import { FxCanvas } from '../feel/FxCanvas'
import { podiumRows, SAMPLES } from './fixtures'
import { VictoryOverlay } from './VictoryOverlay'

const g = SAMPLES[0]!
const rows = podiumRows(g)

const meta: Meta<typeof VictoryOverlay> = {
  title: 'Scoreboard/VictoryOverlay',
  component: VictoryOverlay,
  parameters: { tally: { overlay: true } },
  args: {
    winner: rows[0]?.name ?? 'Kate',
    gameName: g.name,
    total: rows[0]?.total ?? 0,
    rows,
  },
  argTypes: { onDone: { action: 'done' }, onRematch: { action: 'rematch' } },
  render: (args) => (
    <>
      <FxCanvas />
      <VictoryOverlay {...args} />
    </>
  ),
}
export default meta
type Story = StoryObj<typeof VictoryOverlay>

/** A three-player sample game: confetti cannon on mount, losers' sting at 2.3 s. */
export const ThreePlayers: Story = {}
export const TwoPlayers: Story = {
  args: {
    winner: 'Blair',
    gameName: 'Sushi Go',
    total: 112,
    rows: [
      { id: 'blair', name: 'Blair', color: 1, total: 112 },
      { id: 'kate', name: 'Kate', color: 0, total: 98 },
    ],
  },
}
export const FourPlayers: Story = {
  args: {
    winner: 'Rowan',
    gameName: 'Flip 7',
    total: 207,
    rows: [
      { id: 'rowan', name: 'Rowan', color: 3, total: 207 },
      { id: 'kate', name: 'Kate', color: 0, total: 176 },
      { id: 'alder', name: 'Alder', color: 2, total: 150 },
      { id: 'blair', name: 'Blair', color: 1, total: 98 },
    ],
  },
}

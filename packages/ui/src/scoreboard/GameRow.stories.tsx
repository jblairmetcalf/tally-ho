import type { Meta, StoryObj } from '@storybook/react'
import { gameRowProps, SAMPLES } from './fixtures'
import { GameRow } from './GameRow'

const first = SAMPLES[0]!

const meta: Meta<typeof GameRow> = {
  title: 'Scoreboard/GameRow',
  component: GameRow,
  args: gameRowProps(first),
  argTypes: { onClick: { action: 'open' } },
}
export default meta
type Story = StoryObj<typeof GameRow>

export const Default: Story = {}
export const SixPlayers: Story = {
  args: {
    name: 'Skull King',
    winner: { name: 'Rowan', color: 3 },
    completedAt: '2026-10-11T20:15:00Z',
    rounds: 10,
    totals: [
      { id: 'rowan', name: 'Rowan', color: 3, total: 420, won: true },
      { id: 'kate', name: 'Kate', color: 0, total: 310, won: false },
      { id: 'mags', name: 'Mags', color: 4, total: 250, won: false },
      { id: 'theo', name: 'Theo', color: 5, total: 120, won: false },
      { id: 'blair', name: 'Blair', color: 1, total: 40, won: false },
      { id: 'alder', name: 'Alder', color: 2, total: -60, won: false },
    ],
  },
}
/** Recent games: the latest three from the core samples. */
export const RecentList: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2.5">
      {SAMPLES.slice(0, 3).map((g) => (
        <GameRow key={g.id} {...gameRowProps(g)} onClick={args.onClick} />
      ))}
    </div>
  ),
}

import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { players } from './fixtures'
import { WinnerPicker } from './WinnerPicker'

const meta: Meta<typeof WinnerPicker> = {
  title: 'Scoreboard/WinnerPicker',
  component: WinnerPicker,
  args: { players: players(3), label: 'Who won?' },
  argTypes: { onPick: { action: 'pick' }, selected: { control: 'text' } },
  render: (args) => (
    <section className="card entry">
      <WinnerPicker {...args} />
    </section>
  ),
}
export default meta
type Story = StoryObj<typeof WinnerPicker>

/** The live game: one tap on a player scores the round for them. */
export const ThreePlayers: Story = {}
/** Two players (Jaipur): side by side. */
export const TwoPlayers: Story = { args: { players: players(2), label: 'Who won round 2?' } }
/** Six players wrap into rows of two. */
export const SixPlayers: Story = { args: { players: players(6) } }
/** Sixteen-character names ellipsize rather than wrap. */
export const LongNames: Story = {
  args: {
    players: [
      { id: 'a', name: 'Bartholomew-Jane', color: 0 },
      { id: 'b', name: 'Maximiliano Ruiz', color: 4 },
      { id: 'c', name: 'Alder', color: 2 },
    ],
  },
}
/** Editing a round (`selected`): the current winner wears its colour and a check. */
export const Editing: Story = {
  render: function Render(args) {
    const [sel, setSel] = useState<string | null>('blair')
    return (
      <section className="card entry">
        <WinnerPicker {...args} selected={sel} onPick={(id) => setSel(id)} />
      </section>
    )
  },
}

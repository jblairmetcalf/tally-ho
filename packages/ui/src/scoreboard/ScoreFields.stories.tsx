import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { players } from './fixtures'
import { ScoreFields } from './ScoreFields'

const meta: Meta<typeof ScoreFields> = {
  title: 'Scoreboard/ScoreFields',
  component: ScoreFields,
  args: { idPrefix: 'entry-' },
  render: function Render(args) {
    const [values, setValues] = useState(args.values)
    const [done, setDone] = useState(0)
    return (
      <section className="card entry">
        <ScoreFields
          {...args}
          values={values}
          onChange={setValues}
          onDone={() => setDone((d) => d + 1)}
        />
        <p className="hint" style={{ margin: 0 }}>
          Enter moves to the next field; Enter on the last calls onDone ({done}).
        </p>
      </section>
    )
  },
}
export default meta
type Story = StoryObj<typeof ScoreFields>

export const Empty: Story = { args: { players: players(3), values: ['', '', ''] } }
export const Filled: Story = { args: { players: players(3), values: ['23', '-10', ''] } }
export const SixPlayers: Story = {
  args: { players: players(6), values: ['', '', '', '', '', ''], idPrefix: 'six-' },
}

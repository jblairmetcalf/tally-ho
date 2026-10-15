import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from '../primitives/Button'
import { RollNumber } from './RollNumber'

const meta: Meta<typeof RollNumber> = {
  title: 'Scoreboard/RollNumber',
  component: RollNumber,
  args: { value: 128 },
}
export default meta
type Story = StoryObj<typeof RollNumber>

export const Static: Story = {
  render: (args) => (
    <span className="display" style={{ fontSize: 42 }}>
      <RollNumber {...args} />
    </span>
  ),
}

/** Counts to the new value in 18 ease-out steps, 22 ms apart. */
export const Rolling: Story = {
  render: function Render() {
    const [v, setV] = useState(42)
    return (
      <div className="flex items-center gap-4">
        <span className="display" style={{ fontSize: 42, minWidth: 90 }}>
          <RollNumber value={v} />
        </span>
        <Button size="sm" onClick={() => setV((x) => x + 37)}>
          +37
        </Button>
        <Button size="sm" variant="coral" onClick={() => setV((x) => x - 25)}>
          −25
        </Button>
      </div>
    )
  },
}

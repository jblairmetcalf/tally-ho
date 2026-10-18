import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../primitives/Button'
import { FX } from './confetti'
import { FxCanvas } from './FxCanvas'

const meta: Meta<typeof FxCanvas> = {
  title: 'Scoreboard/FxCanvas',
  tags: ['!autodocs'],
  component: FxCanvas,
  parameters: { tally: { overlay: true } },
}
export default meta
type Story = StoryObj<typeof FxCanvas>

/**
 * The shared confetti canvas. Mount once; `FX.fromEl` bursts from a button (a scored round),
 * `FX.celebrate` is the victory cannon. Nothing fires under reduced motion.
 */
export const Confetti: Story = {
  render: () => (
    <div className="flex flex-col gap-3" style={{ maxWidth: 360 }}>
      <FxCanvas />
      <Button onClick={(e) => FX.fromEl(e.currentTarget)} icon="check">
        Burst from here
      </Button>
      <Button variant="amber" onClick={() => FX.celebrate()} icon="trophy">
        Celebrate
      </Button>
      <Button
        variant="ghost"
        onClick={() => FX.burst(window.innerWidth / 2, window.innerHeight / 2, 40, { power: 9 })}
      >
        Small pop, centre
      </Button>
    </div>
  ),
}

import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Deal in', variant: 'jade', size: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['jade', 'amber', 'ghost', 'coral'] },
    size: { control: 'inline-radio', options: ['md', 'sm'] },
    icon: { control: 'select', options: [undefined, 'plus', 'check', 'trash', 'right', 'repeat'] },
  },
}
export default meta
type Story = StoryObj<typeof Button>

/** Play with every prop. Press and hold to feel the 3-D squash. */
export const Playground: Story = {}

/** The four slabs. Jade is the main action, amber starts a game, ghost is secondary, coral destroys. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Button variant="jade" icon="check">
        Save round 3
      </Button>
      <Button variant="amber">Deal in · Rummy</Button>
      <Button variant="ghost" icon="plus" iconSize={18}>
        Add
      </Button>
      <Button variant="coral" icon="trash" iconSize={20}>
        Delete this game
      </Button>
    </div>
  ),
}

/** `size="sm"`: the Resume / Clear size (40px tall). */
export const Small: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" icon="right">
        Resume
      </Button>
      <Button size="sm" variant="ghost">
        Clear
      </Button>
      <Button size="sm" variant="amber">
        Rematch
      </Button>
    </div>
  ),
}

/** `block` fills the column, as at the bottom of every sheet. */
export const Block: Story = { args: { block: true, variant: 'amber', children: 'Start game' } }

/** The second tap of a coral confirm: fills and shakes. See `ConfirmButton` for the behaviour. */
export const Armed: Story = {
  args: {
    variant: 'coral',
    armed: true,
    block: true,
    icon: 'trash',
    iconSize: 20,
    children: 'Tap again to delete',
  },
}

/** An icon leads the label. */
export const WithIcon: Story = { args: { icon: 'repeat', children: 'Rematch', variant: 'ghost' } }

export const Disabled: Story = { args: { disabled: true, children: 'Start game' } }

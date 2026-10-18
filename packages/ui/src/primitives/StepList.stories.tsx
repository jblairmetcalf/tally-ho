import type { Meta, StoryObj } from '@storybook/react'
import { StepList } from './StepList'

const meta: Meta<typeof StepList> = {
  title: 'Primitives/StepList',
  component: StepList,
  args: {
    label: 'How to add it',
    steps: [
      {
        text: (
          <>
            Tap <b>Share</b> in the toolbar
          </>
        ),
        icon: 'share',
      },
      {
        text: (
          <>
            Scroll down and tap <b>Add to Home Screen</b>
          </>
        ),
        icon: 'addSquare',
      },
      {
        text: (
          <>
            Tap <b>Add</b>
          </>
        ),
      },
    ],
  },
  argTypes: { steps: { control: false } },
}
export default meta
type Story = StoryObj<typeof StepList>

/** iPhone Safari: three steps, each with the icon to look for. */
export const IPhone: Story = {}

/** Android Chrome's menu route. */
export const Android: Story = {
  args: {
    steps: [
      {
        text: (
          <>
            Tap the <b>menu</b> at the top right
          </>
        ),
        icon: 'more',
      },
      {
        text: (
          <>
            Tap <b>Install app</b> or <b>Add to Home screen</b>
          </>
        ),
        icon: 'addSquare',
      },
      {
        text: (
          <>
            Tap <b>Install</b>
          </>
        ),
      },
    ],
  },
}

/** A long step wraps beside its number and icon. */
export const LongStep: Story = {
  args: {
    steps: [
      {
        text: 'In Chrome or Edge on an iPhone, the Share button lives at the end of the address bar, inside the menu',
        icon: 'share',
      },
      { text: 'Tap Add' },
    ],
  },
}

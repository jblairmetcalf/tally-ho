import type { Meta, StoryObj } from '@storybook/react'
import { TextInput } from './TextInput'

const meta: Meta<typeof TextInput> = {
  title: 'Primitives/TextInput',
  component: TextInput,
  args: { placeholder: 'Add a player', 'aria-label': 'Player name' },
}
export default meta
type Story = StoryObj<typeof TextInput>

/** Placeholder in faint; focus for the jade ring. */
export const Empty: Story = {}
export const Filled: Story = { args: { defaultValue: 'Grandma Jo' } }
/** Numeric (the goal target), tabular figures. */
export const Numeric: Story = {
  args: {
    defaultValue: '200',
    inputMode: 'numeric',
    className: 'num',
    'aria-label': 'Points to win',
  },
}
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Rummy' } }

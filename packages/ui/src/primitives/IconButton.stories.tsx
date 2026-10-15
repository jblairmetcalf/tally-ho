import type { Meta, StoryObj } from '@storybook/react'
import { IconButton } from './IconButton'

const meta: Meta<typeof IconButton> = {
  title: 'Primitives/IconButton',
  component: IconButton,
  args: { icon: 'x', label: 'Close' },
}
export default meta
type Story = StoryObj<typeof IconButton>

/** Muted icon on a surface square. Tilts when pressed. */
export const Default: Story = {}
/** `on`: lit jade, e.g. sound is on. */
export const On: Story = { args: { icon: 'volume', label: 'Turn sound off', on: true } }
/** `danger`: coral, e.g. end the game. */
export const Danger: Story = { args: { icon: 'flag', label: 'End game', danger: true } }

/** The header row in the app: sound toggle, settings, back. */
export const Row: Story = {
  render: () => (
    <div className="flex gap-2">
      <IconButton icon="back" label="Back" />
      <IconButton icon="volume" label="Turn sound off" on />
      <IconButton icon="mute" label="Turn sound on" />
      <IconButton icon="gear" label="Settings" />
      <IconButton icon="flag" label="End game" danger />
    </div>
  ),
}
